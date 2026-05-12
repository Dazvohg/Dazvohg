-- ============================================================
-- MANGO TYCOON — seed market_assets
-- ============================================================

insert into public.market_assets (id, type, name, description, price, yield_rate, location, risk_level, educational_note, icon) values
  -- Empresas
  ('ypf',          'company',      'YPF S.A.',                        'La principal empresa petrolera argentina, controlada por el Estado.',             12500,  0.8, 'Buenos Aires',        'medium', 'Las acciones de YPF cotizan en NYSE y BCBA. Su valor está ligado al precio del crudo y decisiones estatales.',       '🛢️'),
  ('mercadolibre', 'company',      'MercadoLibre',                    'El mayor marketplace de Latinoamérica, fundado en Buenos Aires en 1999.',         85000,  1.2, 'Buenos Aires',        'medium', 'MercadoLibre cotiza en NASDAQ. Incluye MercadoPago, MercadoEnvíos y MercadoCredito.',                              '🛒'),
  ('arcor',        'company',      'Arcor',                           'El mayor productor de golosinas de Argentina y líder mundial en caramelos.',       8900,  0.6, 'Córdoba',             'low',    'Arcor exporta a más de 100 países. Empresa familiar argentina que se globalizó.',                                  '🍬'),
  ('techint',      'company',      'Techint Group',                   'Conglomerado industrial siderúrgico y de ingeniería de clase mundial.',            45000,  0.9, 'Buenos Aires',        'medium', 'Techint incluye Tenaris y Ternium, productores de tubos de acero para la industria del petróleo.',                 '⚙️'),
  ('banco_macro',  'company',      'Banco Macro',                     'Uno de los bancos privados más grandes de Argentina.',                             6200,  1.1, 'Buenos Aires',        'high',   'Los bancos argentinos tienen alta rentabilidad pero exposición al riesgo soberano y cambios regulatorios del BCRA.','🏦'),
  -- Bienes Raíces
  ('depto_palermo',         'real_estate', 'Departamento en Palermo',           '2 ambientes en uno de los barrios más cotizados de CABA.',               95000,  0.4, 'Palermo, CABA',       'low',    'Los inmuebles en Argentina se cotizan en dólares. Palermo es zona premium con alta demanda.',                       '🏠'),
  ('local_microcentro',     'real_estate', 'Local Comercial Microcentro',       'Local de 80m² en zona céntrica de CABA con alto tráfico.',               120000, 0.7, 'Microcentro, CABA',   'medium', 'Los locales comerciales tienen mayor rendimiento que los residenciales pero más riesgo de vacancia.',              '🏪'),
  ('casa_tigre',            'real_estate', 'Casa en Tigre',                     'Casa con pileta en barrio cerrado del delta del Tigre.',                 150000, 0.35,'Tigre, GBA Norte',    'low',    'Los countries del GBA Norte se revalorizaron post-pandemia por el boom del teletrabajo.',                         '🏡'),
  ('oficina_puerto_madero', 'real_estate', 'Oficina en Puerto Madero',          'Oficina premium AAA en el barrio más moderno de Buenos Aires.',          280000, 0.9, 'Puerto Madero, CABA', 'medium', 'Puerto Madero es el barrio más caro de Argentina. Las oficinas premium mantienen valor en crisis.',                '🏢'),
  ('vinedo_mendoza',        'real_estate', 'Viñedo en Mendoza',                 '20 hectáreas con cepas de Malbec en el Valle de Uco.',                   340000, 1.1, 'Valle de Uco, Mendoza','medium','Los viñedos en Mendoza se cotizan en dólares. El Malbec argentino es el más vendido del mundo en su varietal.',    '🍇'),
  -- Bonos
  ('al30',         'bond',         'Bono AL30',                       'Bono soberano argentino bajo ley local con vencimiento en 2030.',                  3200,  2.1, 'BCBA',                'high',   'Alto rendimiento por riesgo de default. Argentina tuvo 9 defaults históricos.',                                    '📜'),
  ('gd35',         'bond',         'Bono GD35',                       'Global Bond argentino en dólares bajo ley extranjera, venc. 2035.',                4800,  2.8, 'NYSE / BCBA',         'high',   'Los GD cotizan bajo ley de Nueva York, más protegidos que los AL (ley argentina).',                                '💵'),
  ('lecap',        'bond',         'LECAP',                           'Letra de Capitalización del Tesoro argentino. Corto plazo en pesos.',              1100,  1.5, 'BCBA',                'medium', 'Instrumentos de corto plazo en pesos para preservar poder adquisitivo frente a la inflación.',                   '📋'),
  ('on_ypf',       'bond',         'ON YPF',                          'Obligación Negociable de YPF en dólares a 5 años.',                               9500,  1.8, 'BCBA',                'medium', 'Las ONs corporativas tienen menor riesgo que los soberanos. YPF es cuasi-soberana.',                              '🏭'),
  ('bono_neuquen', 'bond',         'Bono Neuquén 2027',               'Bono provincial respaldado por regalías de Vaca Muerta.',                         7200,  2.3, 'BCBA',                'high',   'Neuquén emite bonos respaldados por regalías de Vaca Muerta, el mayor yacimiento no convencional fuera de EEUU.',  '⛽'),
  -- Clubes
  ('boca',         'club',         'Club Atlético Boca Juniors',      'El club más popular de Argentina. La mitad más uno.',                             500000, 1.5, 'La Boca, CABA',       'medium', 'Boca tiene 6 Copas Libertadores. Su economía depende de ventas de jugadores, TV y 300.000 socios.',               '💛'),
  ('river',        'club',         'Club Atlético River Plate',       'El Millonario. La academia de fútbol más prestigiosa del país.',                  520000, 1.6, 'Núñez, CABA',         'medium', 'River tiene la cantera más productiva de Argentina. Exportar jugadores a Europa es su modelo de negocio.',        '❤️'),
  ('racing',       'club',         'Racing Club',                     'La Academia. Primer campeón de América en 1967.',                                 180000, 1.2, 'Avellaneda, GBA',     'medium', 'Racing fue el primer club sudamericano en ganar la Copa Intercontinental (1967).',                                '💙'),
  ('san_lorenzo',  'club',         'San Lorenzo de Almagro',          'El Ciclón. Campeón de la Copa Libertadores 2014.',                               155000, 1.1, 'Flores, CABA',        'medium', 'San Lorenzo recuperó su predio histórico por ley del Congreso. El Papa Francisco es hincha declarado.',           '🔵'),
  ('talleres',     'club',         'Talleres de Córdoba',             'Club en ascenso con una de las mejores canchas del interior.',                     95000, 1.0, 'Córdoba Capital',     'high',   'Talleres modernizó el estadio Mario Kempes a 30.000 espectadores. El club más popular del interior.',             '⚽')
on conflict (id) do nothing;

-- ============================================================
-- seed objectives
-- ============================================================

insert into public.objectives (id, title, description, reward, condition, category, icon) values
  ('first_investment', 'Primera Inversión',       'Comprá tu primer activo en el mercado.',                          500,   '{"type":"own_assets","quantity":1}',                        'investment', '🌱'),
  ('buy_bond',         'Bonista',                 'Comprá tu primer bono del Estado o corporativo.',                 800,   '{"type":"buy_asset","assetType":"bond","quantity":1}',       'investment', '📜'),
  ('buy_real_estate',  'Ladrillero',              'Invertí en tu primer inmueble.',                                  1200,  '{"type":"buy_asset","assetType":"real_estate","quantity":1}','investment', '🏠'),
  ('reach_5000',       'Ahorrista',               'Acumulá 5.000 Mango Cash en efectivo.',                           600,   '{"type":"reach_cash","amount":5000}',                        'trading',    '💰'),
  ('buy_company',      'Empresario',              'Comprá acciones de una empresa argentina.',                       1500,  '{"type":"buy_asset","assetType":"company","quantity":1}',    'investment', '💼'),
  ('buy_club',         '¡Soy el Dueño!',          'Comprá participación en un club de fútbol argentino.',            2000,  '{"type":"buy_asset","assetType":"club","quantity":1}',       'investment', '⚽'),
  ('diversify',        'Portfolio Diversificado', 'Tené activos de al menos 4 tipos distintos.',                     3000,  '{"type":"own_assets","quantity":4}',                        'portfolio',  '🎯'),
  ('reach_50000',      'Inversor Serio',          'Alcanzá un patrimonio neto de 50.000 Mango Cash.',                2500,  '{"type":"portfolio_value","amount":50000}',                  'portfolio',  '📈'),
  ('reach_level_3',    'En Carrera',              'Alcanzá el nivel 3.',                                             1500,  '{"type":"reach_level","level":3}',                           'level',      '⭐'),
  ('three_real_estate','Magnate Inmobiliario',     'Tené 3 o más propiedades en tu portfolio.',                       5000,  '{"type":"buy_asset","assetType":"real_estate","quantity":3}','investment', '🏙️'),
  ('three_companies',  'Holding',                 'Invertí en 3 empresas argentinas distintas.',                     5000,  '{"type":"buy_asset","assetType":"company","quantity":3}',    'investment', '🏭'),
  ('five_bonds',       'El Bonista',              'Tené 5 bonos en tu portfolio.',                                   4500,  '{"type":"buy_asset","assetType":"bond","quantity":5}',       'investment', '📊'),
  ('reach_level_5',    'Tycoon en Ascenso',       'Alcanzá el nivel 5.',                                             4000,  '{"type":"reach_level","level":5}',                           'level',      '🌟'),
  ('reach_200000',     'El Mango Grande',         'Alcanzá un patrimonio neto de 200.000 Mango Cash.',               10000, '{"type":"portfolio_value","amount":200000}',                 'portfolio',  '🥭'),
  ('superclasico',     'El Superclásico',         'Tené participación en Boca Y en River simultáneamente.',          15000, '{"type":"buy_asset","assetType":"club","quantity":2}',       'investment', '🏆'),
  ('reach_level_10',   'Magnate Argentino',       'Alcanzá el nivel 10.',                                            20000, '{"type":"reach_level","level":10}',                          'level',      '👑'),
  ('reach_500000',     'Medio Palo',              'Alcanzá un patrimonio neto de 500.000 Mango Cash.',               25000, '{"type":"portfolio_value","amount":500000}',                 'portfolio',  '💎'),
  ('reach_1000000',    'Millonario de Mango',     'Alcanzá el millón de Mango Cash de patrimonio neto.',             50000, '{"type":"portfolio_value","amount":1000000}',                'portfolio',  '🎰')
on conflict (id) do nothing;
