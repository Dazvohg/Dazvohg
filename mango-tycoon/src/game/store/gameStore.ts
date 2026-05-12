import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'
import { calculatePassiveIncome } from '../engine/passiveIncome'
import { calculateLevel } from '../engine/economy'
import { MARKET_ASSETS } from '../data/assets'
import { OBJECTIVES } from '../data/objectives'
import type {
  GameProfile,
  OwnedAsset,
  PlayerObjective,
  EconomyEvent,
  MarketAsset,
  IncomeNotification,
} from '../../types/game'

// Maps DB row → MarketAsset
function rowToAsset(row: any): MarketAsset {
  return {
    id:              row.id,
    type:            row.type,
    name:            row.name,
    description:     row.description,
    price:           row.price,
    yieldRate:       row.yield_rate,
    location:        row.location,
    riskLevel:       row.risk_level,
    educationalNote: row.educational_note,
    icon:            row.icon,
  }
}

interface GameState {
  profile: GameProfile | null
  ownedAssets: OwnedAsset[]
  playerObjectives: PlayerObjective[]
  activeEvent: EconomyEvent | null
  marketAssets: MarketAsset[]
  incomeNotification: IncomeNotification | null
  loading: boolean

  loadProfile: (userId: string) => Promise<void>
  buyAsset: (assetId: string) => Promise<void>
  sellAsset: (ownedAssetId: string) => Promise<void>
  claimObjective: (objectiveId: string) => Promise<void>
  collectPassiveIncome: () => Promise<void>
  dismissIncomeNotification: () => void
  triggerRandomEvent: () => void
  checkObjectives: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: null,
      ownedAssets: [],
      playerObjectives: [],
      activeEvent: null,
      marketAssets: MARKET_ASSETS,  // populated from DB on load
      incomeNotification: null,
      loading: false,

      // ─── LOAD ─────────────────────────────────────────────────────────────
      loadProfile: async (userId) => {
        set({ loading: true })

        const [profileRes, assetsRes, objRes, marketRes, activeEventRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('player_assets')
            .select('*, asset:market_assets(*)')
            .eq('player_id', userId),
          supabase
            .from('player_objectives')
            .select('*')
            .eq('player_id', userId),
          // Load all market assets with live prices from DB
          supabase.from('market_assets').select('*'),
          // Load the latest active economy event from DB
          supabase
            .from('economy_events')
            .select('*')
            .gt('active_to', new Date().toISOString())
            .order('active_from', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        // Update market assets from DB (live prices)
        if (marketRes.data && marketRes.data.length > 0) {
          set({ marketAssets: (marketRes.data as any[]).map(rowToAsset) })
        }

        // Set active economy event from DB
        if (activeEventRes.data) {
          const row = activeEventRes.data as any
          set({
            activeEvent: {
              id:          row.id,
              type:        row.type,
              title:       row.title,
              description: row.description,
              impact:      row.impact,
              activeFrom:  row.active_from,
              activeTo:    row.active_to,
            },
          })
        }

        // Subscribe to real-time market price updates
        supabase
          .channel('market-assets-live')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'market_assets' },
            (payload) => {
              const updated = rowToAsset(payload.new)
              set((state) => ({
                marketAssets: state.marketAssets.map((a) =>
                  a.id === updated.id ? updated : a,
                ),
                // Also refresh owned asset prices so portfolio value is live
                ownedAssets: state.ownedAssets.map((oa) =>
                  oa.assetId === updated.id ? { ...oa, asset: updated } : oa,
                ),
              }))
            },
          )
          .subscribe()

        // Subscribe to new economy events
        supabase
          .channel('economy-events-live')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'economy_events' },
            (payload) => {
              const row = payload.new as any
              set({
                activeEvent: {
                  id:          row.id,
                  type:        row.type,
                  title:       row.title,
                  description: row.description,
                  impact:      row.impact,
                  activeFrom:  row.active_from,
                  activeTo:    row.active_to,
                },
              })
            },
          )
          .subscribe()

        const profile: GameProfile | null = profileRes.data
          ? {
              id: profileRes.data.id,
              username: profileRes.data.username,
              level: profileRes.data.level,
              mangoCash: profileRes.data.mango_cash,
              lastLogin: profileRes.data.last_login,
              totalInvested: profileRes.data.total_invested,
              createdAt: profileRes.data.created_at,
            }
          : null

        const ownedAssets: OwnedAsset[] = ((assetsRes.data as any[]) ?? []).map((row) => ({
          id: row.id,
          assetId: row.asset_id,
          asset: rowToAsset(row.asset),
          quantity: row.quantity,
          boughtAt: row.bought_at,
          purchasedAt: row.purchased_at,
        }))

        const completedIds = new Set(
          ((objRes.data as any[]) ?? [])
            .filter((r) => r.completed_at)
            .map((r) => r.objective_id),
        )

        const playerObjectives: PlayerObjective[] = OBJECTIVES.map((obj) => ({
          objectiveId: obj.id,
          completedAt: completedIds.has(obj.id)
            ? (objRes.data as any[]).find((r) => r.objective_id === obj.id)?.completed_at
            : null,
          readyToClaim: false,
          objective: obj,
        }))

        // Insert missing objective rows for this player
        const existingIds = new Set(((objRes.data as any[]) ?? []).map((r) => r.objective_id))
        const missing = OBJECTIVES.filter((o) => !existingIds.has(o.id)).map((o) => ({
          player_id: userId,
          objective_id: o.id,
          completed_at: null,
        }))
        if (missing.length > 0) {
          await supabase.from('player_objectives').insert(missing)
        }

        set({ profile, ownedAssets, playerObjectives, loading: false })

        if (profile) {
          await get().collectPassiveIncome()
          get().checkObjectives()
        }

        if (Math.random() < 0.3) get().triggerRandomEvent()
      },

      // ─── BUY ──────────────────────────────────────────────────────────────
      buyAsset: async (assetId) => {
        const { profile, ownedAssets, marketAssets } = get()
        if (!profile) return

        const asset = marketAssets.find((a) => a.id === assetId)
        if (!asset) return
        if (profile.mangoCash < asset.price) throw new Error('No tenés suficiente Mango Cash')

        const newCash = profile.mangoCash - asset.price
        const newInvested = profile.totalInvested + asset.price
        const newLevel = calculateLevel(newInvested)

        const existing = ownedAssets.find((oa) => oa.assetId === assetId)

        if (existing) {
          await supabase
            .from('player_assets')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id)

          set((state) => ({
            ownedAssets: state.ownedAssets.map((oa) =>
              oa.id === existing.id ? { ...oa, quantity: oa.quantity + 1 } : oa,
            ),
          }))
        } else {
          const { data } = await supabase
            .from('player_assets')
            .insert({
              player_id: profile.id,
              asset_id: assetId,
              bought_at: asset.price,
              quantity: 1,
            })
            .select()
            .single()

          if (data) {
            set((state) => ({
              ownedAssets: [
                ...state.ownedAssets,
                {
                  id: (data as any).id,
                  assetId: asset.id,
                  asset,
                  quantity: 1,
                  boughtAt: asset.price,
                  purchasedAt: (data as any).purchased_at,
                },
              ],
            }))
          }
        }

        await supabase
          .from('profiles')
          .update({ mango_cash: newCash, total_invested: newInvested, level: newLevel })
          .eq('id', profile.id)

        set((state) => ({
          profile: state.profile
            ? { ...state.profile, mangoCash: newCash, totalInvested: newInvested, level: newLevel }
            : null,
        }))

        get().checkObjectives()
      },

      // ─── SELL ─────────────────────────────────────────────────────────────
      sellAsset: async (ownedAssetId) => {
        const { profile, ownedAssets } = get()
        if (!profile) return

        const owned = ownedAssets.find((oa) => oa.id === ownedAssetId)
        if (!owned) return

        // 10% selling fee — encourages holding
        const salePrice = Math.round(owned.asset.price * 0.9)

        if (owned.quantity > 1) {
          await supabase
            .from('player_assets')
            .update({ quantity: owned.quantity - 1 })
            .eq('id', ownedAssetId)
          set((state) => ({
            ownedAssets: state.ownedAssets.map((oa) =>
              oa.id === ownedAssetId ? { ...oa, quantity: oa.quantity - 1 } : oa,
            ),
          }))
        } else {
          await supabase.from('player_assets').delete().eq('id', ownedAssetId)
          set((state) => ({
            ownedAssets: state.ownedAssets.filter((oa) => oa.id !== ownedAssetId),
          }))
        }

        const newCash = profile.mangoCash + salePrice
        await supabase.from('profiles').update({ mango_cash: newCash }).eq('id', profile.id)
        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash } : null,
        }))
      },

      // ─── CLAIM OBJECTIVE ──────────────────────────────────────────────────
      claimObjective: async (objectiveId) => {
        const { profile, playerObjectives } = get()
        if (!profile) return

        const po = playerObjectives.find((p) => p.objectiveId === objectiveId)
        if (!po || po.completedAt || !po.readyToClaim) return

        const now = new Date().toISOString()
        const newCash = profile.mangoCash + po.objective.reward

        await Promise.all([
          supabase
            .from('player_objectives')
            .update({ completed_at: now })
            .eq('player_id', profile.id)
            .eq('objective_id', objectiveId),
          supabase
            .from('profiles')
            .update({ mango_cash: newCash })
            .eq('id', profile.id),
        ])

        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash } : null,
          playerObjectives: state.playerObjectives.map((p) =>
            p.objectiveId === objectiveId
              ? { ...p, completedAt: now, readyToClaim: false }
              : p,
          ),
        }))
      },

      // ─── PASSIVE INCOME ───────────────────────────────────────────────────
      collectPassiveIncome: async () => {
        const { profile, ownedAssets } = get()
        if (!profile || ownedAssets.length === 0) return

        const notification = calculatePassiveIncome(ownedAssets, profile.lastLogin)
        if (notification.total === 0) return

        const now = new Date().toISOString()
        const newCash = profile.mangoCash + notification.total

        await supabase
          .from('profiles')
          .update({ mango_cash: newCash, last_login: now })
          .eq('id', profile.id)

        set((state) => ({
          profile: state.profile
            ? { ...state.profile, mangoCash: newCash, lastLogin: now }
            : null,
          incomeNotification: notification,
        }))
      },

      dismissIncomeNotification: () => set({ incomeNotification: null }),

      // Events now come from DB via real-time subscription — triggerRandomEvent is a no-op
      triggerRandomEvent: () => {},

      // ─── CHECK OBJECTIVES ─────────────────────────────────────────────────
      checkObjectives: () => {
        const { profile, ownedAssets, playerObjectives } = get()
        if (!profile) return

        const portfolioValue =
          profile.mangoCash +
          ownedAssets.reduce((s, oa) => s + oa.asset.price * oa.quantity, 0)

        const assetTypeCount = (type: string) =>
          ownedAssets.filter((oa) => oa.asset.type === type).length

        const updated = playerObjectives.map((po) => {
          if (po.completedAt) return po
          const { condition } = po.objective
          let met = false

          switch (condition.type) {
            case 'own_assets':
              met = ownedAssets.length >= (condition.quantity ?? 1)
              break
            case 'buy_asset':
              met = assetTypeCount(condition.assetType!) >= (condition.quantity ?? 1)
              break
            case 'reach_cash':
              met = profile.mangoCash >= (condition.amount ?? 0)
              break
            case 'portfolio_value':
              met = portfolioValue >= (condition.amount ?? 0)
              break
            case 'reach_level':
              met = profile.level >= (condition.level ?? 1)
              break
          }

          return met ? { ...po, readyToClaim: true } : po
        })

        set({ playerObjectives: updated })
      },
    }),
    {
      name: 'mango-tycoon',
      // Only persist the active event so it survives a page refresh
      partialize: (state) => ({ activeEvent: state.activeEvent }),
    },
  ),
)
