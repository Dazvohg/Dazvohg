import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'
import { calculatePassiveIncome } from '../engine/passiveIncome'
import { calculateLevel } from '../engine/economy'
import { MARKET_ASSETS } from '../data/assets'
import { OBJECTIVES } from '../data/objectives'
import {
  emptyReputation,
  addReputation,
  getSectorForAsset,
  getRepGain,
} from '../engine/reputation'
import type {
  GameProfile,
  OwnedAsset,
  PlayerObjective,
  EconomyEvent,
  MarketAsset,
  IncomeNotification,
  PlayerReputation,
  OwnedCompany,
  RepSector,
} from '../../types/game'

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
    requiredRep: row.required_rep_sector
      ? { sector: row.required_rep_sector as RepSector, points: row.required_rep_points ?? 0 }
      : undefined,
  }
}

interface GameState {
  profile: GameProfile | null
  ownedAssets: OwnedAsset[]
  playerObjectives: PlayerObjective[]
  activeEvent: EconomyEvent | null
  marketAssets: MarketAsset[]
  incomeNotification: IncomeNotification | null
  reputation: PlayerReputation
  ownedCompany: OwnedCompany | null
  loading: boolean

  loadProfile: (userId: string) => Promise<void>
  buyAsset: (assetId: string) => Promise<void>
  sellAsset: (ownedAssetId: string) => Promise<void>
  claimObjective: (objectiveId: string) => Promise<void>
  collectPassiveIncome: () => Promise<void>
  dismissIncomeNotification: () => void
  triggerRandomEvent: () => void
  checkObjectives: () => void
  foundCompany: (name: string, type: string, sector: RepSector, capital: number) => Promise<void>
  expandCompany: (additionalCapital: number) => Promise<void>
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: null,
      ownedAssets: [],
      playerObjectives: [],
      activeEvent: null,
      marketAssets: MARKET_ASSETS,
      incomeNotification: null,
      reputation: emptyReputation(),
      ownedCompany: null,
      loading: false,

      // ─── LOAD ─────────────────────────────────────────────────────────────
      loadProfile: async (userId) => {
        set({ loading: true })

        const [profileRes, assetsRes, objRes, marketRes, activeEventRes, repRes, companyRes] =
          await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('player_assets').select('*, asset:market_assets(*)').eq('player_id', userId),
            supabase.from('player_objectives').select('*').eq('player_id', userId),
            supabase.from('market_assets').select('*'),
            supabase
              .from('economy_events')
              .select('*')
              .gt('active_to', new Date().toISOString())
              .order('active_from', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase.from('player_reputation').select('*').eq('player_id', userId),
            supabase.from('own_companies').select('*').eq('player_id', userId).maybeSingle(),
          ])

        // Market assets with rep requirements
        if (marketRes.data && marketRes.data.length > 0) {
          set({ marketAssets: (marketRes.data as any[]).map(rowToAsset) })
        }

        // Active economy event
        if (activeEventRes.data) {
          const row = activeEventRes.data as any
          set({
            activeEvent: {
              id: row.id, type: row.type, title: row.title, description: row.description,
              impact: row.impact, activeFrom: row.active_from, activeTo: row.active_to,
            },
          })
        }

        // Reputation
        const rep = emptyReputation()
        if (repRes.data) {
          for (const row of repRes.data as any[]) {
            if (row.sector in rep) {
              (rep as any)[row.sector] = row.points
            }
          }
        }

        // Own company
        let ownedCompany: OwnedCompany | null = null
        if (companyRes.data) {
          const c = companyRes.data as any
          ownedCompany = {
            id: c.id, name: c.name, type: c.type, sector: c.sector,
            capitalInvested: c.capital_invested, yieldRate: c.yield_rate,
            foundedAt: c.founded_at, lastEventDesc: c.last_event_desc,
            lastEventDelta: c.last_event_delta, lastEventAt: c.last_event_at,
          }
        }

        // Real-time subscriptions
        supabase
          .channel('market-assets-live')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_assets' },
            (payload) => {
              const updated = rowToAsset(payload.new)
              set((state) => ({
                marketAssets: state.marketAssets.map((a) => a.id === updated.id ? updated : a),
                ownedAssets: state.ownedAssets.map((oa) =>
                  oa.assetId === updated.id ? { ...oa, asset: updated } : oa),
              }))
            })
          .subscribe()

        supabase
          .channel('economy-events-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'economy_events' },
            (payload) => {
              const row = payload.new as any
              set({
                activeEvent: {
                  id: row.id, type: row.type, title: row.title, description: row.description,
                  impact: row.impact, activeFrom: row.active_from, activeTo: row.active_to,
                },
              })
            })
          .subscribe()

        // Real-time company event updates
        supabase
          .channel('own-company-live')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'own_companies' },
            (payload) => {
              const c = payload.new as any
              if (c.player_id !== userId) return
              set({
                ownedCompany: {
                  id: c.id, name: c.name, type: c.type, sector: c.sector,
                  capitalInvested: c.capital_invested, yieldRate: c.yield_rate,
                  foundedAt: c.founded_at, lastEventDesc: c.last_event_desc,
                  lastEventDelta: c.last_event_delta, lastEventAt: c.last_event_at,
                },
              })
            })
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
          id: row.id, assetId: row.asset_id, asset: rowToAsset(row.asset),
          quantity: row.quantity, boughtAt: row.bought_at, purchasedAt: row.purchased_at,
        }))

        const completedIds = new Set(
          ((objRes.data as any[]) ?? []).filter((r) => r.completed_at).map((r) => r.objective_id),
        )

        const playerObjectives: PlayerObjective[] = OBJECTIVES.map((obj) => ({
          objectiveId: obj.id,
          completedAt: completedIds.has(obj.id)
            ? (objRes.data as any[]).find((r) => r.objective_id === obj.id)?.completed_at
            : null,
          readyToClaim: false,
          objective: obj,
        }))

        const existingIds = new Set(((objRes.data as any[]) ?? []).map((r) => r.objective_id))
        const missing = OBJECTIVES.filter((o) => !existingIds.has(o.id)).map((o) => ({
          player_id: userId, objective_id: o.id, completed_at: null,
        }))
        if (missing.length > 0) {
          await supabase.from('player_objectives').insert(missing)
        }

        set({ profile, ownedAssets, playerObjectives, reputation: rep, ownedCompany, loading: false })

        if (profile) {
          await get().collectPassiveIncome()
          get().checkObjectives()
        }
      },

      // ─── BUY ──────────────────────────────────────────────────────────────
      buyAsset: async (assetId) => {
        const { profile, ownedAssets, marketAssets, reputation } = get()
        if (!profile) return

        const asset = marketAssets.find((a) => a.id === assetId)
        if (!asset) return
        if (profile.mangoCash < asset.price) throw new Error('No tenés suficiente Mango Cash')

        const newCash = profile.mangoCash - asset.price
        const newInvested = profile.totalInvested + asset.price
        const newLevel = calculateLevel(newInvested)

        const existing = ownedAssets.find((oa) => oa.assetId === assetId)

        if (existing) {
          await supabase.from('player_assets').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
          set((state) => ({
            ownedAssets: state.ownedAssets.map((oa) =>
              oa.id === existing.id ? { ...oa, quantity: oa.quantity + 1 } : oa),
          }))
        } else {
          const { data } = await supabase
            .from('player_assets')
            .insert({ player_id: profile.id, asset_id: assetId, bought_at: asset.price, quantity: 1 })
            .select().single()

          if (data) {
            set((state) => ({
              ownedAssets: [...state.ownedAssets, {
                id: (data as any).id, assetId: asset.id, asset, quantity: 1,
                boughtAt: asset.price, purchasedAt: (data as any).purchased_at,
              }],
            }))
          }
        }

        await supabase.from('profiles').update({ mango_cash: newCash, total_invested: newInvested, level: newLevel }).eq('id', profile.id)

        set((state) => ({
          profile: state.profile
            ? { ...state.profile, mangoCash: newCash, totalInvested: newInvested, level: newLevel }
            : null,
        }))

        // Gain reputation
        const sector = getSectorForAsset(asset.type)
        if (sector) {
          const gain = getRepGain(asset.type)
          const newRep = addReputation(reputation, sector, gain)
          set({ reputation: newRep })
          // Persist reputation to DB
          await supabase.from('player_reputation').upsert({
            player_id: profile.id, sector, points: newRep[sector], updated_at: new Date().toISOString(),
          })
        }

        get().checkObjectives()
      },

      // ─── SELL ─────────────────────────────────────────────────────────────
      sellAsset: async (ownedAssetId) => {
        const { profile, ownedAssets } = get()
        if (!profile) return

        const owned = ownedAssets.find((oa) => oa.id === ownedAssetId)
        if (!owned) return

        const salePrice = Math.round(owned.asset.price * 0.9)

        if (owned.quantity > 1) {
          await supabase.from('player_assets').update({ quantity: owned.quantity - 1 }).eq('id', ownedAssetId)
          set((state) => ({
            ownedAssets: state.ownedAssets.map((oa) =>
              oa.id === ownedAssetId ? { ...oa, quantity: oa.quantity - 1 } : oa),
          }))
        } else {
          await supabase.from('player_assets').delete().eq('id', ownedAssetId)
          set((state) => ({
            ownedAssets: state.ownedAssets.filter((oa) => oa.id !== ownedAssetId),
          }))
        }

        const newCash = profile.mangoCash + salePrice
        await supabase.from('profiles').update({ mango_cash: newCash }).eq('id', profile.id)
        set((state) => ({ profile: state.profile ? { ...state.profile, mangoCash: newCash } : null }))
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
          supabase.from('player_objectives')
            .update({ completed_at: now })
            .eq('player_id', profile.id)
            .eq('objective_id', objectiveId),
          supabase.from('profiles').update({ mango_cash: newCash }).eq('id', profile.id),
        ])

        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash } : null,
          playerObjectives: state.playerObjectives.map((p) =>
            p.objectiveId === objectiveId ? { ...p, completedAt: now, readyToClaim: false } : p),
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

        await supabase.from('profiles').update({ mango_cash: newCash, last_login: now }).eq('id', profile.id)

        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash, lastLogin: now } : null,
          incomeNotification: notification,
        }))
      },

      dismissIncomeNotification: () => set({ incomeNotification: null }),

      triggerRandomEvent: () => {},

      // ─── CHECK OBJECTIVES ─────────────────────────────────────────────────
      checkObjectives: () => {
        const { profile, ownedAssets, playerObjectives, reputation } = get()
        if (!profile) return

        const portfolioValue =
          profile.mangoCash + ownedAssets.reduce((s, oa) => s + oa.asset.price * oa.quantity, 0)

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
            case 'reach_rep':
              if (condition.sector) {
                met = (reputation[condition.sector] ?? 0) >= (condition.repPoints ?? 0)
              }
              break
          }

          return met ? { ...po, readyToClaim: true } : po
        })

        set({ playerObjectives: updated })
      },

      // ─── FOUND COMPANY ────────────────────────────────────────────────────
      foundCompany: async (name, type, sector, capital) => {
        const { profile } = get()
        if (!profile) return
        if (profile.mangoCash < capital) throw new Error('No tenés suficiente Mango Cash')

        // Yield tiers based on capital
        const yieldRate =
          capital >= 5000 ? 1.6 :
          capital >= 2500 ? 1.3 :
          capital >= 1000 ? 1.0 : 0.8

        const { data, error } = await supabase
          .from('own_companies')
          .insert({
            player_id: profile.id, name, type, sector, capital_invested: capital, yield_rate: yieldRate,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)

        const newCash = profile.mangoCash - capital
        const newInvested = profile.totalInvested + capital
        const newLevel = calculateLevel(newInvested)

        await supabase.from('profiles').update({
          mango_cash: newCash, total_invested: newInvested, level: newLevel,
        }).eq('id', profile.id)

        const c = data as any
        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash, totalInvested: newInvested, level: newLevel } : null,
          ownedCompany: {
            id: c.id, name: c.name, type: c.type, sector: c.sector,
            capitalInvested: c.capital_invested, yieldRate: c.yield_rate,
            foundedAt: c.founded_at, lastEventDesc: null, lastEventDelta: 0, lastEventAt: null,
          },
        }))

        // Rep boost for founding
        const newRep = addReputation(get().reputation, sector, 20)
        set({ reputation: newRep })
        await supabase.from('player_reputation').upsert({
          player_id: profile.id, sector, points: newRep[sector], updated_at: new Date().toISOString(),
        })

        get().checkObjectives()
      },

      // ─── EXPAND COMPANY ───────────────────────────────────────────────────
      expandCompany: async (additionalCapital) => {
        const { profile, ownedCompany } = get()
        if (!profile || !ownedCompany) return
        if (profile.mangoCash < additionalCapital) throw new Error('No tenés suficiente Mango Cash')

        const newCapital = ownedCompany.capitalInvested + additionalCapital
        const newYield =
          newCapital >= 10000 ? 2.0 :
          newCapital >= 5000  ? 1.6 :
          newCapital >= 2500  ? 1.3 :
          newCapital >= 1000  ? 1.0 : 0.8

        await supabase.from('own_companies').update({
          capital_invested: newCapital, yield_rate: newYield,
        }).eq('id', ownedCompany.id)

        const newCash = profile.mangoCash - additionalCapital
        const newInvested = profile.totalInvested + additionalCapital
        const newLevel = calculateLevel(newInvested)
        await supabase.from('profiles').update({
          mango_cash: newCash, total_invested: newInvested, level: newLevel,
        }).eq('id', profile.id)

        set((state) => ({
          profile: state.profile ? { ...state.profile, mangoCash: newCash, totalInvested: newInvested, level: newLevel } : null,
          ownedCompany: state.ownedCompany
            ? { ...state.ownedCompany, capitalInvested: newCapital, yieldRate: newYield }
            : null,
        }))

        // Small rep boost for expansion
        const newRep = addReputation(get().reputation, ownedCompany.sector, 5)
        set({ reputation: newRep })
        await supabase.from('player_reputation').upsert({
          player_id: profile.id, sector: ownedCompany.sector, points: newRep[ownedCompany.sector],
          updated_at: new Date().toISOString(),
        })
      },
    }),
    {
      name: 'mango-tycoon',
      partialize: (state) => ({
        activeEvent: state.activeEvent,
        reputation: state.reputation,
      }),
    },
  ),
)
