-- ============================================
-- SEED DATA FOR PRODUCTS
-- Run this after schema.sql to populate test data
-- ============================================

-- Note: published_by is set to NULL for seed data since we don't have user profiles yet
-- In production, these would reference actual user profiles

insert into public.products (slug, title, subtitle, description, image_url, tags, build_type, theme_category, difficulty, tier, minimum_likes, guide_url, download_url, published_by) values
-- EXPLORER TIER PRODUCTS
('roman-woman-statue', 'The Woman Statue', 'Statue of Napoleon if he was not a war guy', 
'A beautiful statue of a woman looking to her right or something. This build took ages to build and I am sure you will like it! It has amazing texturing and looks perfect even without shaders - this is an amazing addition to your museum or medieval project.',
'/builds/woman-statue.png', array['statue', 'medieval', 'textured'], 'statues', 'medieval', 'medium', 'explorer', 487, 
'https://example.com/guide/woman-statue', 'https://example.com/download/woman-statue.schematic', null),

('medieval-fountain', 'Grand Medieval Fountain', 'A majestic centerpiece for any town square',
'This ornate fountain features intricate stone carvings and flowing water effects. Perfect for medieval towns, castles, or fantasy builds. Includes detailed instructions for water placement.',
'/builds/medieval-fountain.png', array['fountain', 'medieval', 'water', 'decoration'], 'fountains', 'medieval', 'easy', 'explorer', 312,
'https://example.com/guide/medieval-fountain', 'https://example.com/download/medieval-fountain.schematic', null),

('fantasy-portal', 'Enchanted Nether Portal', 'A mystical gateway to another dimension',
'Transform your boring nether portal into a magical gateway. Features glowing runes, floating crystals, and mysterious fog effects. Compatible with most texture packs.',
'/builds/fantasy-portal.png', array['portal', 'fantasy', 'magic', 'nether'], 'portals', 'fantasy', 'easy', 'explorer', 756,
'https://example.com/guide/fantasy-portal', 'https://example.com/download/fantasy-portal.schematic', null),

('simple-cottage', 'Cozy Starter Cottage', 'The perfect beginner-friendly home',
'A charming small cottage perfect for survival mode. Features a cozy interior with fireplace, bedroom, and storage area. Great for beginners learning to build.',
'/builds/starter-cottage.png', array['house', 'cottage', 'starter', 'survival'], 'houses', 'medieval', 'easy', 'explorer', 1203,
'https://example.com/guide/starter-cottage', 'https://example.com/download/starter-cottage.schematic', null),

-- ACCESS TIER PRODUCTS
('viking-longship', 'Viking Longship', 'Sail the seas like a true Norse warrior',
'An authentic Viking longship complete with dragon head prow, shields along the sides, and detailed interior. Perfect for coastal villages or as a standalone piece.',
'/builds/viking-longship.png', array['vehicle', 'ship', 'viking', 'medieval'], 'vehicles', 'medieval', 'medium', 'access', 234,
'https://example.com/guide/viking-longship', 'https://example.com/download/viking-longship.schematic', null),

('japanese-shrine', 'Shinto Shrine', 'A peaceful place of worship',
'Traditional Japanese shrine with torii gate, main hall, and zen garden. Features authentic architectural details and peaceful atmosphere.',
'/builds/japanese-shrine.png', array['shrine', 'japanese', 'asian', 'religious'], 'houses', 'ancient', 'medium', 'access', 567,
'https://example.com/guide/japanese-shrine', 'https://example.com/download/japanese-shrine.schematic', null),

('steampunk-airship', 'Steampunk Airship', 'Take to the skies in style',
'A magnificent steam-powered airship with brass detailing, spinning propellers, and luxurious passenger cabin. Includes both exterior and interior designs.',
'/builds/steampunk-airship.png', array['vehicle', 'airship', 'steampunk', 'fantasy'], 'vehicles', 'fantasy', 'hard', 'access', 892,
'https://example.com/guide/steampunk-airship', 'https://example.com/download/steampunk-airship.schematic', null),

('christmas-village', 'Christmas Village Pack', 'A complete winter wonderland',
'Collection of 5 festive buildings including Santa workshop, gingerbread house, ice skating rink, Christmas tree, and cozy cabin. Perfect for holiday servers.',
'/builds/christmas-village.png', array['christmas', 'holiday', 'village', 'pack'], 'asset_packs', 'christmas', 'medium', 'access', 1456,
'https://example.com/guide/christmas-village', 'https://example.com/download/christmas-village.zip', null),

('greek-temple', 'Temple of Athena', 'Classical Greek architecture at its finest',
'A stunning recreation of a Greek temple with marble columns, detailed friezes, and golden accents. Includes interior with statue of Athena.',
'/builds/greek-temple.png', array['temple', 'greek', 'ancient', 'classical'], 'houses', 'ancient', 'hard', 'access', 678,
'https://example.com/guide/greek-temple', 'https://example.com/download/greek-temple.schematic', null),

-- BUILDER TIER PRODUCTS
('dragon-statue', 'Ancient Dragon Statue', 'A fearsome guardian for your fortress',
'Massive dragon statue perched on a rocky outcrop. Features incredible detail from scales to wings, with optional fire breath effect using redstone.',
'/builds/dragon-statue.png', array['statue', 'dragon', 'fantasy', 'large'], 'statues', 'fantasy', 'expert', 'builder', 1823,
'https://example.com/guide/dragon-statue', 'https://example.com/download/dragon-statue.schematic', null),

('cyberpunk-tower', 'Neon Skyscraper', 'A towering monument to the future',
'Futuristic skyscraper with holographic billboards, neon lighting, and detailed interior floors. Perfect for modern or sci-fi cities.',
'/builds/cyberpunk-tower.png', array['building', 'cyberpunk', 'modern', 'skyscraper'], 'houses', 'sci_fi', 'expert', 'builder', 934,
'https://example.com/guide/cyberpunk-tower', 'https://example.com/download/cyberpunk-tower.schematic', null),

('haunted-mansion', 'Victorian Haunted Mansion', 'A spooky residence for Halloween',
'Creepy Victorian mansion with broken windows, overgrown garden, and secret passages. Includes spooky interior decorations and hidden rooms.',
'/builds/haunted-mansion.png', array['house', 'halloween', 'spooky', 'victorian'], 'houses', 'halloween', 'hard', 'builder', 2156,
'https://example.com/guide/haunted-mansion', 'https://example.com/download/haunted-mansion.schematic', null),

('underwater-dome', 'Atlantean Dome City', 'Live beneath the waves',
'A massive underwater glass dome containing a complete city. Features air locks, coral gardens, and bioluminescent lighting.',
'/builds/underwater-dome.png', array['underwater', 'dome', 'city', 'fantasy'], 'maps', 'fantasy', 'expert', 'builder', 1567,
'https://example.com/guide/underwater-dome', 'https://example.com/download/underwater-dome.zip', null),

('brutalist-bunker', 'Cold War Bunker', 'Survive the apocalypse in style',
'Massive concrete bunker with multiple levels, command center, living quarters, and armory. Brutalist architecture meets survival gameplay.',
'/builds/brutalist-bunker.png', array['bunker', 'brutalist', 'survival', 'military'], 'houses', 'brutalist', 'hard', 'builder', 445,
'https://example.com/guide/brutalist-bunker', 'https://example.com/download/brutalist-bunker.schematic', null),

-- ARCHITECT TIER PRODUCTS
('mega-castle', 'Kingdom of Eldoria', 'A complete medieval kingdom',
'Massive castle complex with main keep, outer walls, village, farms, and surrounding landscape. Over 50,000 blocks of hand-crafted detail.',
'/builds/mega-castle.png', array['castle', 'kingdom', 'medieval', 'mega'], 'maps', 'medieval', 'expert', 'architect', 4521,
'https://example.com/guide/mega-castle', 'https://example.com/download/mega-castle.zip', null),

('organic-tree', 'World Tree Yggdrasil', 'The tree that holds the universe',
'Colossal organic tree build spanning 300+ blocks high. Features intricate root system, hollow interior with rooms, and branches reaching to the sky.',
'/builds/world-tree.png', array['organic', 'tree', 'fantasy', 'mega'], 'organics', 'fantasy', 'expert', 'architect', 3892,
'https://example.com/guide/world-tree', 'https://example.com/download/world-tree.schematic', null),

('space-station', 'Orbital Command Station', 'Your base among the stars',
'Detailed space station with multiple modules, docking bays, observation deck, and zero-gravity garden. Perfect for sci-fi servers.',
'/builds/space-station.png', array['space', 'station', 'sci-fi', 'mega'], 'vehicles', 'sci_fi', 'expert', 'architect', 2134,
'https://example.com/guide/space-station', 'https://example.com/download/space-station.schematic', null),

('nature-pack', 'Ultimate Nature Pack', '50+ organic builds in one pack',
'Comprehensive nature pack including various trees, rocks, flowers, mushrooms, and terrain features. Essential for any builder serious about landscaping.',
'/builds/nature-pack.png', array['nature', 'organic', 'pack', 'landscape'], 'asset_packs', 'nature', 'medium', 'architect', 5678,
'https://example.com/guide/nature-pack', 'https://example.com/download/nature-pack.zip', null),

-- Additional variety products
('modern-villa', 'Luxury Modern Villa', 'Contemporary living at its finest',
'Sleek modern villa with infinity pool, rooftop terrace, and floor-to-ceiling windows. Interior fully furnished with modern decor.',
'/builds/modern-villa.png', array['house', 'modern', 'luxury', 'villa'], 'houses', 'modern', 'medium', 'access', 876,
'https://example.com/guide/modern-villa', 'https://example.com/download/modern-villa.schematic', null),

('pirate-cove', 'Hidden Pirate Cove', 'A secret harbor for scallywags',
'Complete pirate hideout with hidden cave entrance, docked ships, treasure room, and tavern. Arr, matey!',
'/builds/pirate-cove.png', array['pirate', 'cave', 'harbor', 'adventure'], 'maps', 'fantasy', 'hard', 'builder', 1234,
'https://example.com/guide/pirate-cove', 'https://example.com/download/pirate-cove.zip', null),

('windmill', 'Dutch Windmill', 'A charming countryside addition',
'Traditional Dutch windmill with rotating blades mechanism using redstone. Includes interior with grinding mechanism and living quarters.',
'/builds/windmill.png', array['windmill', 'dutch', 'farm', 'redstone'], 'houses', 'medieval', 'medium', 'explorer', 543,
'https://example.com/guide/windmill', 'https://example.com/download/windmill.schematic', null),

('elven-treehouse', 'Elven Treehouse Village', 'Live among the ancient trees',
'Network of elegant treehouses connected by rope bridges. Features organic integration with giant trees and magical lighting.',
'/builds/elven-treehouse.png', array['treehouse', 'elven', 'fantasy', 'village'], 'houses', 'fantasy', 'hard', 'builder', 1678,
'https://example.com/guide/elven-treehouse', 'https://example.com/download/elven-treehouse.schematic', null),

('colosseum', 'Roman Colosseum', 'The greatest arena ever built',
'Accurate recreation of the Roman Colosseum with underground chambers, seating areas, and arena floor. Perfect for PvP events.',
'/builds/colosseum.png', array['colosseum', 'roman', 'ancient', 'arena'], 'houses', 'ancient', 'expert', 'architect', 2987,
'https://example.com/guide/colosseum', 'https://example.com/download/colosseum.schematic', null),

('mushroom-house', 'Giant Mushroom Home', 'A whimsical fairy tale dwelling',
'Oversized mushroom converted into a cozy home. Features multiple floors, spiral staircase, and magical garden.',
'/builds/mushroom-house.png', array['mushroom', 'fantasy', 'fairy', 'organic'], 'organics', 'fantasy', 'easy', 'explorer', 892,
'https://example.com/guide/mushroom-house', 'https://example.com/download/mushroom-house.schematic', null),

('desert-temple', 'Ancient Desert Temple', 'Secrets buried in the sands',
'Massive desert temple with hieroglyphics, trap-filled corridors, and treasure chambers. Inspired by ancient Egyptian architecture.',
'/builds/desert-temple.png', array['temple', 'desert', 'egyptian', 'ancient'], 'houses', 'ancient', 'hard', 'access', 765,
'https://example.com/guide/desert-temple', 'https://example.com/download/desert-temple.schematic', null),

('ice-palace', 'Frozen Ice Palace', 'A castle fit for a snow queen',
'Stunning ice palace with frozen spires, crystal chandeliers, and magical aurora effects. Built primarily with ice and packed ice.',
'/builds/ice-palace.png', array['ice', 'palace', 'frozen', 'christmas'], 'houses', 'christmas', 'hard', 'builder', 1432,
'https://example.com/guide/ice-palace', 'https://example.com/download/ice-palace.schematic', null),

('mech-walker', 'Battle Mech Walker', 'A towering war machine',
'Massive bipedal mech with poseable limbs, cockpit interior, and weapon systems. Perfect for sci-fi or steampunk worlds.',
'/builds/mech-walker.png', array['mech', 'robot', 'vehicle', 'sci-fi'], 'vehicles', 'sci_fi', 'expert', 'architect', 1876,
'https://example.com/guide/mech-walker', 'https://example.com/download/mech-walker.schematic', null),

('wizard-tower', 'Arcane Wizard Tower', 'Home of a powerful mage',
'Tall spiral tower with enchanting room, library, alchemy lab, and observatory. Features magical particle effects suggestions.',
'/builds/wizard-tower.png', array['tower', 'wizard', 'magic', 'fantasy'], 'houses', 'fantasy', 'medium', 'access', 1123,
'https://example.com/guide/wizard-tower', 'https://example.com/download/wizard-tower.schematic', null),

('samurai-castle', 'Feudal Japanese Castle', 'Honor and tradition',
'Traditional Japanese castle with multiple tiers, cherry blossom gardens, and koi ponds. Authentic architectural style.',
'/builds/samurai-castle.png', array['castle', 'japanese', 'asian', 'samurai'], 'houses', 'ancient', 'expert', 'builder', 2345,
'https://example.com/guide/samurai-castle', 'https://example.com/download/samurai-castle.schematic', null);

-- Add some variety to creation dates for testing sort functionality
update public.products set created_at = now() - interval '2 months' where slug = 'roman-woman-statue';
update public.products set created_at = now() - interval '1 month' where slug = 'medieval-fountain';
update public.products set created_at = now() - interval '3 weeks' where slug = 'fantasy-portal';
update public.products set created_at = now() - interval '2 weeks' where slug = 'simple-cottage';
update public.products set created_at = now() - interval '10 days' where slug = 'viking-longship';
update public.products set created_at = now() - interval '1 week' where slug = 'japanese-shrine';
update public.products set created_at = now() - interval '5 days' where slug = 'steampunk-airship';
update public.products set created_at = now() - interval '3 days' where slug = 'christmas-village';
update public.products set created_at = now() - interval '2 days' where slug = 'greek-temple';
update public.products set created_at = now() - interval '1 day' where slug = 'dragon-statue';
