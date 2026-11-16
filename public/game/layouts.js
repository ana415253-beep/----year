// All world coordinates and room configurations (Section 24). Single source of truth for the engine,
// renderer, interaction system, scene scripts, debug editor and validator.
//
// Conventions
//   Floor-standing objects and characters: anchor 'bottom-center' -> x = horizontal centre, y = floor contact.
//   Wall-mounted objects: anchor 'top-left' (x,y = top-left corner) or 'top-center' (x = centre, y = top edge).
//   collision / walkable / triggers: plain rectangles {x, y, width, height} with top-left origin.
//   Objects with `on: <id>` rest on another object and are depth-sorted directly after it.
//   `note` documents every deviation from the Section 24 tables.
(function () {
  const WORLD_LAYOUTS = {
    // ------------------------------------------------------------------ SCENE 01 OFFICE
        office: {
      name: 'Pemberton & Co. office',
      width: 480, height: 270,
      cameraBounds: { x: 0, y: 0, width: 480, height: 270 },
      playerSpawn: { x: 180, y: 151, direction: 'up' },
      wall: { base: 88, blockRight: { x: 438, y: 0, width: 42, height: 148 } },
      surface: 'carpet',
      walkable: [
        { x: 12, y: 90, width: 426, height: 166 },
        { x: 438, y: 150, width: 30, height: 106 }
      ],
      furniture: [
        // Roni's desk - clean, spacious, organized with plant, pen holder, coaster, messy papers & workbag
        { id: 'office_roni_desk', type: 'office_desk', x: 180, y: 125, width: 100, height: 35, solid: true, collision: { x: 130, y: 104, width: 100, height: 21 },
          interactive: true, prompt: 'Shut down computer', interactionPoint: { x: 180, y: 140 }, interactionRadius: 18, facing: 'up', essential: true },
        { id: 'office_chair', type: 'office_chair', x: 180, y: 152, width: 23, height: 24, solid: false },
        { id: 'office_desk_organizer', type: 'desk_organizer', x: 142, y: 106, width: 16, height: 8, on: 'office_roni_desk',
          interactive: true, prompt: 'Examine desk organizer', interactionPoint: { x: 142, y: 140 }, interactionRadius: 12, facing: 'up' },
        { id: 'office_desk_plant', type: 'desk_plant', x: 156, y: 105, width: 10, height: 11, on: 'office_roni_desk',
          interactive: true, prompt: 'Admire desk succulent', interactionPoint: { x: 156, y: 140 }, interactionRadius: 12, facing: 'up' },
        { id: 'office_coaster', type: 'coaster', x: 148, y: 115, width: 8, height: 4, on: 'office_roni_desk' },
        { id: 'office_roni_mug', type: 'mug', x: 148, y: 114, width: 6, height: 6, on: 'office_roni_desk', note: 'Coffee cup resting on neat cork coaster.' },
        { id: 'office_monitor', type: 'office_monitor', x: 180, y: 101, width: 30, height: 18, on: 'office_roni_desk' },
        { id: 'office_keyboard', type: 'keyboard', x: 180, y: 115, width: 25, height: 5, on: 'office_roni_desk' },
        { id: 'office_desk_mouse', type: 'desk_mouse', x: 199, y: 115, width: 5, height: 4, on: 'office_roni_desk' },
        { id: 'office_pen_holder', type: 'pen_holder', x: 204, y: 104, width: 7, height: 10, on: 'office_roni_desk',
          interactive: true, prompt: 'Examine pen holder', interactionPoint: { x: 204, y: 140 }, interactionRadius: 12, facing: 'up' },
        { id: 'office_paperwork', type: 'paper_stack', x: 220, y: 114, width: 15, height: 10, on: 'office_roni_desk',
          interactive: true, prompt: 'Collect messy papers', interactionPoint: { x: 220, y: 138 }, interactionRadius: 15, facing: 'up' },
        { id: 'office_work_bag', type: 'work_bag', x: 244, y: 125, width: 18, height: 19, solid: false,
          interactive: true, prompt: 'Pick up work bag', interactionPoint: { x: 244, y: 138 }, interactionRadius: 16, facing: 'up', essential: true },
        { id: 'office_wastebasket', type: 'wastebasket', x: 236, y: 158, width: 13, height: 18, solid: true, collision: { x: 230, y: 152, width: 13, height: 6 },
          interactive: true, prompt: 'Examine wastebasket', interactionPoint: { x: 236, y: 170 }, interactionRadius: 14, facing: 'up' },
        // Clara's coworker desk - organized & spaced cleanly away from edges and corner plant
        { id: 'office_clara_desk', type: 'office_desk', variant: 'clara', x: 80, y: 125, width: 80, height: 32, solid: true, collision: { x: 40, y: 105, width: 80, height: 20 },
          interactive: true, prompt: "Talk to Clara", interactionPoint: { x: 80, y: 140 }, interactionRadius: 16, facing: 'up' },
        { id: 'office_clara_chair', type: 'office_chair', x: 80, y: 152, width: 22, height: 23, solid: false },
        { id: 'office_clara_plant', type: 'desk_plant', variant: 'succulent', x: 50, y: 108, width: 8, height: 9, on: 'office_clara_desk' },
        { id: 'office_clara_monitor', type: 'office_monitor', variant: 'small', x: 74, y: 105, width: 24, height: 15, on: 'office_clara_desk' },
        { id: 'office_clara_keyboard', type: 'keyboard', x: 74, y: 116, width: 20, height: 5, on: 'office_clara_desk' },
        { id: 'office_clara_photo', type: 'photo_frame', x: 96, y: 106, width: 8, height: 9, on: 'office_clara_desk' },
        { id: 'office_clara_stationery', type: 'pen_holder', x: 109, y: 109, width: 7, height: 8, on: 'office_clara_desk' },
        // Pemberton's desk - balanced spacing inside desk edges with zero overlap
        { id: 'office_penguin_desk', type: 'office_desk', variant: 'penguin', x: 345, y: 125, width: 85, height: 32, solid: true, collision: { x: 302, y: 105, width: 85, height: 20 },
          interactive: true, prompt: "Examine Mr. Pemberton's desk", interactionPoint: { x: 345, y: 140 }, interactionRadius: 16, facing: 'up' },
        { id: 'office_penguin_photo', type: 'photo_frame', x: 314, y: 106, width: 8, height: 9, on: 'office_penguin_desk' },
        { id: 'office_penguin_mug', type: 'mug', x: 326, y: 113, width: 6, height: 6, on: 'office_penguin_desk', note: 'Invented desk detail.' },
        { id: 'office_penguin_monitor', type: 'office_monitor', variant: 'small', x: 345, y: 105, width: 24, height: 15, on: 'office_penguin_desk', note: 'Invented desk detail.' },
        { id: 'office_penguin_stationery', type: 'desk_organizer', x: 372, y: 108, width: 14, height: 7, on: 'office_penguin_desk' },
        { id: 'office_penguin_chair', type: 'office_chair', variant: 'penguin', x: 345, y: 151, width: 22, height: 23, solid: false },
        // Filing cabinet & water cooler discussion spot
        { id: 'office_filing_cabinet', type: 'filing_cabinet', x: 425, y: 135, width: 27, height: 44, solid: true, collision: { x: 411, y: 119, width: 27, height: 16 },
          interactive: true, prompt: 'Examine filing cabinet', interactionPoint: { x: 404, y: 132 }, interactionRadius: 14, facing: 'right' },
        { id: 'office_water_cooler', type: 'water_cooler', x: 270, y: 110, width: 14, height: 30, solid: true, collision: { x: 263, y: 104, width: 14, height: 6 },
          interactive: true, prompt: 'Chat by water cooler', interactionPoint: { x: 270, y: 124 }, interactionRadius: 14, facing: 'up' },
        { id: 'office_corner_plant', type: 'tall_plant', x: 17, y: 125, width: 16, height: 32, solid: true, collision: { x: 10, y: 119, width: 14, height: 6 } }
      ],
      decorations: [
        { id: 'office_window_left', type: 'office_window', x: 20, y: 12, width: 96, height: 54, anchor: 'top-left', layer: 'wall' },
        { id: 'office_calendar', type: 'calendar', x: 120, y: 24, width: 20, height: 26, anchor: 'top-left', layer: 'wall',
          interactive: true, prompt: 'Check office calendar', interactionPoint: { x: 130, y: 92 }, interactionRadius: 16, facing: 'up' },
        { id: 'office_noticeboard', type: 'noticeboard', x: 150, y: 22, width: 40, height: 30, anchor: 'top-left', layer: 'wall' },
        { id: 'office_wall_clock', type: 'wall_clock', x: 240, y: 30, width: 18, height: 18, anchor: 'top-left', layer: 'wall' },
        { id: 'office_window_right', type: 'office_window', x: 296, y: 12, width: 96, height: 54, anchor: 'top-left', layer: 'wall' },
        { id: 'office_elevator', type: 'elevator', x: 440, y: 75, width: 35, height: 72, anchor: 'top-left', layer: 'wall',
          interactive: true, prompt: 'Take elevator', to: 'street', entry: 'default', interactionPoint: { x: 457, y: 160 }, interactionRadius: 18, facing: 'up', essential: true },
        { id: 'office_exit_sign', type: 'exit_sign', x: 440, y: 30, width: 28, height: 9, anchor: 'top-left', layer: 'wall' }
      ],
      interactables: [],
      collision: [],
      exits: [],
      entries: { default: { x: 180, y: 151, direction: 'up' } }
    },

    // ------------------------------------------------------------------ SCENE 02 / 04 STREET
        street: {
      name: 'Maple Street',
      width: 960, height: 270,
      cameraBounds: { x: 0, y: 0, width: 960, height: 242 },
      playerSpawn: { x: 45, y: 207, direction: 'right' },
      surface: 'pavement',
      walkable: [{ x: 20, y: 175, width: 920, height: 50 }],
      furniture: [
        { id: 'street_lamp_01', type: 'streetlamp', x: 105, y: 172, width: 12, height: 90 },
        { id: 'street_storefront_01', type: 'storefront', x: 220, y: 122, width: 95, height: 80,
          interactive: true, prompt: 'Look in the window', interactionPoint: { x: 220, y: 180 }, interactionRadius: 20, facing: 'up' },
        { id: 'street_trash_can', type: 'trash_can', x: 275, y: 172, width: 10, height: 14, note: 'Invented.' },
        { id: 'street_tree_01', type: 'tree', x: 340, y: 168, width: 35, height: 65 },
        { id: 'street_lamp_02', type: 'streetlamp', x: 410, y: 172, width: 12, height: 90, variant: 'flicker' },
        { id: 'street_planter_01', type: 'planter', x: 460, y: 172, width: 24, height: 12, note: 'Invented.' },
        { id: 'street_bus_stop', type: 'bus_stop', x: 510, y: 168, width: 68, height: 56,
          interactive: true, prompt: 'Check timetable', interactionPoint: { x: 512, y: 180 }, interactionRadius: 18, facing: 'up' },
        { id: 'street_bench', type: 'bench', x: 575, y: 172, width: 43, height: 16, sortOffset: -4,
          interactive: true, prompt: 'Sit on bench', interactionPoint: { x: 575, y: 180 }, interactionRadius: 16, facing: 'up' },
        { id: 'street_tree_02', type: 'tree', x: 635, y: 168, width: 35, height: 65 },
        { id: 'street_flower_shop', type: 'flower_shop_front', x: 730, y: 122, width: 110, height: 85 },
        { id: 'street_mailbox', type: 'mailbox', x: 810, y: 172, width: 10, height: 18, note: 'Invented.' },
        { id: 'street_lamp_03', type: 'streetlamp', x: 855, y: 172, width: 12, height: 90 },
        { id: 'street_road_sign', type: 'road_sign', x: 900, y: 172, width: 24, height: 35,
          interactive: true, prompt: 'Read sign', interactionPoint: { x: 900, y: 180 }, interactionRadius: 16, facing: 'up' },
        { id: 'street_hydrant', type: 'hydrant', x: 155, y: 172, width: 8, height: 12, note: 'Invented sidewalk detail.' }
      ],
      decorations: [],
      interactables: [
        { id: 'street_shop_entrance', type: 'zone', x: 730, y: 178, width: 30, height: 35, anchor: 'bottom-center',
          interactive: true, prompt: 'Enter Bloomery', to: 'shop', entry: 'default', interactionPoint: { x: 730, y: 178 }, interactionRadius: 18, facing: 'up', essential: true }
      ],
      collision: [],
      exits: [
        { id: 'street_west_edge', x: 0, y: 170, width: 32, height: 60, label: 'Downtown' },
        { id: 'street_east_edge', x: 928, y: 170, width: 32, height: 60, to: 'porch', entry: 'default', label: 'Home' }
      ],
      entries: { default: { x: 45, y: 207, direction: 'right' }, shop_door: { x: 730, y: 182, direction: 'down' } }
    },

    // ------------------------------------------------------------------ SCENE 05 HOUSE PORCH
    porch: {
      name: 'Front Porch',
      width: 320, height: 210,
      cameraBounds: { x: 0, y: 0, width: 320, height: 210 },
      playerSpawn: { x: 160, y: 192, direction: 'up' },
      wall: { base: 132 },
      surface: 'pavement',
      walkable: [{ x: 40, y: 136, width: 240, height: 68 }],
      furniture: [
        { id: 'porch_front_door', type: 'house_front_door', x: 160, y: 136, width: 30, height: 52,
          interactive: true, prompt: 'Unlock front door', to: 'living', entry: 'default', interactionPoint: { x: 160, y: 148 }, interactionRadius: 18, facing: 'up', essential: true },
        { id: 'porch_plant_left', type: 'tall_plant', x: 116, y: 138, width: 16, height: 28, solid: true, collision: { x: 109, y: 132, width: 14, height: 6 } },
        { id: 'porch_plant_right', type: 'tall_plant', x: 204, y: 138, width: 16, height: 28, solid: true, collision: { x: 197, y: 132, width: 14, height: 6 } },
        { id: 'porch_mailbox', type: 'mailbox', x: 248, y: 152, width: 10, height: 18, solid: true, collision: { x: 243, y: 147, width: 10, height: 5 },
          interactive: true, prompt: 'Check mailbox', interactionPoint: { x: 248, y: 164 }, interactionRadius: 14, facing: 'up' }
      ],
      decorations: [
        { id: 'porch_welcome_mat', type: 'mat', x: 160, y: 146, width: 30, height: 10, layer: 'floor' },
        { id: 'porch_lantern', type: 'porch_lantern', x: 138, y: 100, width: 8, height: 12, anchor: 'top-left', layer: 'wall' }
      ],
      interactables: [],
      collision: [],
      exits: [],
      entries: { default: { x: 160, y: 192, direction: 'up' } }
    },

    // ------------------------------------------------------------------ SCENE 03 FLOWER SHOP
    shop: {
      name: 'Bloomery flower shop',
      width: 480, height: 270,
      cameraBounds: { x: 0, y: 0, width: 480, height: 270 },
      playerSpawn: { x: 65, y: 190, direction: 'right' },
      wall: { base: 96, vestibule: { x: 0, y: 0, width: 56, height: 118 } },
      surface: 'wood',
      walkable: [
        { x: 48, y: 96, width: 422, height: 168 },
        { x: 12, y: 110, width: 46, height: 154 }
      ],
      furniture: [
        { id: 'shop_entrance_door', type: 'shop_door', x: 35, y: 115, width: 32, height: 65,
          interactive: true, prompt: 'Leave shop', to: 'street', entry: 'shop_door', interactionPoint: { x: 35, y: 128 }, interactionRadius: 14, facing: 'up', essential: true },
        { id: 'shop_corner_fern', type: 'tall_plant', variant: 'fern', x: 66, y: 124, width: 16, height: 30, solid: true, collision: { x: 58, y: 116, width: 16, height: 8 },
          interactive: true, prompt: 'Admire potted fern', interactionPoint: { x: 66, y: 135 }, interactionRadius: 14, facing: 'up' },
        { id: 'shop_bucket_01', type: 'flower_bucket', variant: 'tulip', x: 100, y: 145, width: 30, height: 25, solid: true, collision: { x: 86, y: 136, width: 28, height: 9 },
          interactive: true, prompt: 'Look at tulips', interactionPoint: { x: 100, y: 158 }, interactionRadius: 12, facing: 'up' },
        { id: 'shop_bucket_02', type: 'flower_bucket', variant: 'daisy', x: 140, y: 145, width: 30, height: 25, solid: true, collision: { x: 126, y: 136, width: 28, height: 9 },
          interactive: true, prompt: 'Look at daisies', interactionPoint: { x: 140, y: 158 }, interactionRadius: 12, facing: 'up' },
        { id: 'shop_sunflower_display', type: 'flower_display', variant: 'sunflower', x: 195, y: 140, width: 55, height: 40, solid: true, collision: { x: 168, y: 124, width: 54, height: 16 },
          interactive: true, prompt: 'Look at sunflowers', interactionPoint: { x: 195, y: 154 }, interactionRadius: 14, facing: 'up' },
        { id: 'shop_peony_display', type: 'flower_display', variant: 'peony', x: 260, y: 140, width: 48, height: 35, solid: true, collision: { x: 237, y: 126, width: 46, height: 14 },
          interactive: true, prompt: 'Look at peonies', interactionPoint: { x: 260, y: 154 }, interactionRadius: 14, facing: 'up' },
        { id: 'shop_counter', type: 'shop_counter', x: 360, y: 140, width: 95, height: 26, solid: true, collision: { x: 312, y: 128, width: 95, height: 12 } },
        { id: 'shop_cash_register', type: 'cash_register', x: 365, y: 118, width: 15, height: 12, on: 'shop_counter' },
        { id: 'shop_counter_plant', type: 'desk_plant', variant: 'succulent', x: 395, y: 122, width: 8, height: 9, on: 'shop_counter' },
        { id: 'shop_wrapping_table', type: 'wrapping_table', x: 335, y: 95, width: 45, height: 18 },
        { id: 'shop_chalkboard', type: 'chalkboard', x: 316, y: 154, width: 20, height: 26, solid: true, collision: { x: 308, y: 149, width: 16, height: 5 },
          interactive: true, prompt: 'Read chalkboard', interactionPoint: { x: 316, y: 166 }, interactionRadius: 12, facing: 'up' },
        { id: 'shop_floor_ficus', type: 'tall_plant', variant: 'ficus', x: 450, y: 220, width: 16, height: 32, solid: true, collision: { x: 442, y: 212, width: 16, height: 8 },
          interactive: true, prompt: 'Look at fiddle leaf fig', interactionPoint: { x: 432, y: 222 }, interactionRadius: 14, facing: 'right' }
      ],
      decorations: [
        { id: 'shop_window', type: 'shop_window', x: 70, y: 18, width: 74, height: 50, anchor: 'top-left', layer: 'wall' },
        { id: 'shop_back_shelves', type: 'wall_flower_rack', x: 165, y: 30, width: 120, height: 50, anchor: 'top-left', layer: 'wall' },
        { id: 'shop_basket_01', type: 'hanging_basket', x: 125, y: 16, width: 18, height: 38, anchor: 'top-center', layer: 'wall' },
        { id: 'shop_basket_02', type: 'hanging_basket', x: 235, y: 16, width: 18, height: 38, anchor: 'top-center', layer: 'wall' },
        { id: 'shop_basket_03', type: 'hanging_basket', x: 350, y: 16, width: 18, height: 38, anchor: 'top-center', layer: 'wall' },
        { id: 'shop_hanging_sign', type: 'hanging_sign', x: 190, y: 25, width: 75, height: 15, anchor: 'top-left', layer: 'wall' },
        { id: 'shop_entrance_mat', type: 'mat', x: 35, y: 136, width: 34, height: 14, layer: 'floor' },
        { id: 'shop_bouquet', type: 'bouquet_item', x: 340, y: 120, width: 14, height: 16, on: 'shop_counter', hidden: true,
          interactive: true, prompt: 'Pick up bouquet', interactionPoint: { x: 340, y: 156 }, interactionRadius: 18, facing: 'up' }
      ],
      interactables: [
        { id: 'shop_talk_spot', type: 'zone', x: 365, y: 158, width: 30, height: 24, anchor: 'bottom-center',
          interactive: true, prompt: 'Talk to Odette', interactionPoint: { x: 365, y: 158 }, interactionRadius: 20, facing: 'up', essential: true }
      ],
      collision: [
        { id: 'shop_behind_counter', x: 300, y: 96, width: 170, height: 28, note: 'Staff area behind the counter.' },
        { id: 'shop_counter_gate_w', x: 300, y: 124, width: 7, height: 5 },
        { id: 'shop_counter_gate_e', x: 405, y: 124, width: 8, height: 5 }
      ],
      exits: [],
      entries: { default: { x: 65, y: 190, direction: 'right' } }
    },

    // ------------------------------------------------------------------ SCENES 05-08, 10 LIVING ROOM
    living: {
      name: 'Living room',
      width: 480, height: 300,
      cameraBounds: { x: 0, y: 0, width: 480, height: 300 },
      playerSpawn: { x: 35, y: 235, direction: 'right' },
      wall: { top: 25, base: 82, south: 280, west: 10, east: 470,
        westDoor: { y0: 212, y1: 250 }, eastDoor: { y0: 198, y1: 252 } },
      surface: 'wood',
      walkable: [{ x: 12, y: 84, width: 456, height: 194 }],
      furniture: [
        // Sofa centered on carpet and table (x = 170)
        { id: 'living_sofa', type: 'sofa', x: 170, y: 148, width: 84, height: 36, solid: true, collision: { x: 128, y: 126, width: 84, height: 22 },
          interactive: true, prompt: 'Sit on sofa', interactionPoint: { x: 170, y: 158 }, interactionRadius: 18, facing: 'up' },
        // Coffee table placed in middle of carpet (x = 170) with generous room for plates, cake, pizza & vase
        { id: 'living_coffee_table', type: 'coffee_table', x: 170, y: 190, width: 80, height: 26, solid: true, collision: { x: 130, y: 174, width: 80, height: 16 },
          interactive: true, prompt: 'Examine album', interactionPoint: { x: 170, y: 211 }, interactionRadius: 20, facing: 'up', essential: true },
        { id: 'living_piano', type: 'piano', x: 55, y: 94, width: 55, height: 32, solid: true, collision: { x: 28, y: 84, width: 55, height: 10 },
          interactive: true, prompt: 'Play piano', interactionPoint: { x: 50, y: 106 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_cactus', type: 'cactus', x: 75, y: 74, width: 12, height: 16, on: 'living_piano',
          interactive: true, prompt: 'Look at cactus', interactionPoint: { x: 75, y: 106 }, interactionRadius: 12, facing: 'up' },
        { id: 'living_dresser', type: 'dresser', x: 250, y: 94, width: 55, height: 30, solid: true, collision: { x: 223, y: 84, width: 55, height: 10 } },
        { id: 'living_hifi', type: 'hifi', x: 250, y: 74, width: 30, height: 16, on: 'living_dresser',
          interactive: true, prompt: 'Play music', interactionPoint: { x: 250, y: 106 }, interactionRadius: 16, facing: 'up' },
        { id: 'living_crt_tv', type: 'crt_tv', variant: 'facing_up', x: 170, y: 274, width: 48, height: 38, solid: true, collision: { x: 146, y: 262, width: 48, height: 12 },
          interactive: true, prompt: 'Watch TV', interactionPoint: { x: 170, y: 254 }, interactionRadius: 15, facing: 'down' },
        { id: 'living_bookshelf', type: 'bookshelf', x: 310, y: 94, width: 35, height: 70, solid: true, collision: { x: 292, y: 84, width: 35, height: 10 },
          interactive: true, prompt: 'Browse books', interactionPoint: { x: 310, y: 106 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_rotary_phone', type: 'rotary_phone', x: 300, y: 74, width: 12, height: 12, on: 'living_bookshelf',
          interactive: true, prompt: 'Use phone', interactionPoint: { x: 300, y: 106 }, interactionRadius: 12, facing: 'up' },
        { id: 'living_coat_rack', type: 'coat_rack', x: 40, y: 210, width: 20, height: 40, solid: true, collision: { x: 33, y: 204, width: 14, height: 6 },
          interactive: true, prompt: 'Hang up coat', interactionPoint: { x: 42, y: 224 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_cake', type: 'cake', x: 148, y: 173, width: 20, height: 14, on: 'living_coffee_table',
          interactive: true, prompt: 'Cut the cake', interactionPoint: { x: 148, y: 205 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_pizza_box', type: 'pizza_box', x: 180, y: 172, width: 24, height: 12, on: 'living_coffee_table',
          interactive: true, prompt: 'Open pizza', interactionPoint: { x: 180, y: 205 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_vase', type: 'vase', x: 200, y: 172, width: 10, height: 14, on: 'living_coffee_table', hidden: true },
        { id: 'living_plate_01', type: 'cake_plate', x: 144, y: 175, width: 11, height: 7, on: 'living_coffee_table', hidden: true },
        { id: 'living_plate_02', type: 'cake_plate', x: 159, y: 175, width: 11, height: 7, on: 'living_coffee_table', hidden: true },
        // Red gift box on the RIGHT (for Kallita), Blue gift box on the LEFT (for Roni)
        { id: 'living_present_01', type: 'present', variant: 'red', x: 226, y: 161, width: 28, height: 18, solid: true, collision: { x: 212, y: 155, width: 28, height: 6 },
          interactive: true, prompt: 'Open present', interactionPoint: { x: 226, y: 172 }, interactionRadius: 12, facing: 'up' },
        { id: 'living_present_02', type: 'present', variant: 'blue', x: 116, y: 161, width: 18, height: 16, solid: true, collision: { x: 107, y: 155, width: 18, height: 6 },
          interactive: true, prompt: 'Open present', interactionPoint: { x: 116, y: 172 }, interactionRadius: 12, facing: 'up' },
        { id: 'living_tripod_stored', type: 'tripod_folded', x: 342, y: 90, width: 10, height: 22, solid: false, hidden: true },
        { id: 'living_tripod', type: 'tripod_camera', x: 170, y: 222, width: 18, height: 28, hidden: true },
        { id: 'living_balloons', type: 'balloons', x: 232, y: 138, width: 25, height: 35 },
        { id: 'living_floor_plant', type: 'tall_plant', x: 452, y: 118, width: 16, height: 28, solid: true, collision: { x: 445, y: 112, width: 14, height: 6 } },
        { id: 'living_shoe_rack', type: 'shoe_rack', x: 40, y: 266, width: 24, height: 10, solid: true, collision: { x: 28, y: 260, width: 24, height: 6 } }
      ],
      decorations: [
        // Rug centered at x = 170
        { id: 'living_rug', type: 'rug', x: 170, y: 205, width: 130, height: 60, layer: 'floor' },
        { id: 'living_entry_mat', type: 'mat', x: 26, y: 238, width: 22, height: 26, layer: 'floor', variant: 'vertical' },
        { id: 'living_photo_collage', type: 'photo_collage', x: 155, y: 35, width: 70, height: 35, anchor: 'top-center', layer: 'wall',
          interactive: true, prompt: 'Look at photos', interactionPoint: { x: 155, y: 96 }, interactionRadius: 14, facing: 'up' },
        { id: 'living_anniversary_banner', type: 'banner', x: 170, y: 190, width: 64, height: 10, anchor: 'bottom-center', layer: 'furniture', on: 'living_coffee_table', hidden: true },
        { id: 'living_fairy_lights', type: 'fairy_lights', x: 240, y: 26, width: 92, height: 8, anchor: 'top-center', layer: 'wall' },
        { id: 'living_window', type: 'curtain_window', x: 345, y: 30, width: 30, height: 32, anchor: 'top-left', layer: 'wall' },
        { id: 'living_front_door', type: 'side_door', variant: 'west', x: 0, y: 212, width: 10, height: 38, anchor: 'top-left', layer: 'wall',
          interactive: true, prompt: 'Front door', to: 'street', entry: 'default', interactionPoint: { x: 22, y: 238 }, interactionRadius: 12, facing: 'left' }
      ],
      interactables: [
        { id: 'living_kallita_talk', type: 'zone', x: 228, y: 210, width: 16, height: 16, interactive: true,
          prompt: 'Talk to Kallita', interactionPoint: { x: 245, y: 212 }, interactionRadius: 15, facing: 'left' }
      ],
      collision: [],
      exits: [{ id: 'living_to_hallway', x: 460, y: 198, width: 20, height: 54, to: 'hallway', entry: 'from_living' }],
      entries: {
        default: { x: 35, y: 235, direction: 'right' },
        from_hallway: { x: 450, y: 225, direction: 'left' }
      }
    },

    // ------------------------------------------------------------------ HALLWAY (invented layout, 320x240)
    hallway: {
      name: 'Hallway',
      width: 320, height: 240,
      cameraBounds: { x: 0, y: 0, width: 320, height: 240 },
      playerSpawn: { x: 24, y: 178, direction: 'right' },
      wall: { top: 18, base: 74, south: 232, west: 8, east: 312, westDoor: { y0: 150, y1: 202 } },
      surface: 'wood',
      walkable: [{ x: 10, y: 76, width: 300, height: 156 }],
      furniture: [
        { id: 'hallway_kitchen_door', type: 'room_door', variant: 'kitchen', x: 80, y: 74, width: 26, height: 46,
          interactive: true, prompt: 'Enter kitchen', to: 'kitchen', entry: 'from_hallway', interactionPoint: { x: 80, y: 88 }, interactionRadius: 14, facing: 'up', essential: true },
        { id: 'hallway_bedroom_door', type: 'room_door', variant: 'bedroom', x: 240, y: 74, width: 26, height: 46,
          interactive: true, prompt: 'Enter bedroom', to: 'bedroom', entry: 'from_hallway', interactionPoint: { x: 240, y: 88 }, interactionRadius: 14, facing: 'up', essential: true },
        { id: 'hallway_console', type: 'console_table', x: 160, y: 92, width: 40, height: 20, solid: true, collision: { x: 140, y: 82, width: 40, height: 10 },
          interactive: true, prompt: 'Look at framed photo', interactionPoint: { x: 160, y: 104 }, interactionRadius: 12, facing: 'up' },
        { id: 'hallway_umbrella_stand', type: 'umbrella_stand', x: 292, y: 104, width: 12, height: 22, solid: true, collision: { x: 286, y: 99, width: 12, height: 5 } },
        { id: 'hallway_radiator', type: 'radiator', x: 30, y: 96, width: 30, height: 16 }
      ],
      decorations: [
        { id: 'hallway_runner', type: 'runner_rug', x: 165, y: 196, width: 250, height: 28, layer: 'floor' },
        { id: 'hallway_frame_01', type: 'picture_frame', variant: 'tilt', x: 124, y: 30, width: 14, height: 12, anchor: 'top-left', layer: 'wall' },
        { id: 'hallway_frame_02', type: 'picture_frame', x: 182, y: 26, width: 18, height: 14, anchor: 'top-left', layer: 'wall' },
        { id: 'hallway_frame_03', type: 'picture_frame', variant: 'small', x: 146, y: 46, width: 10, height: 10, anchor: 'top-left', layer: 'wall' },
        { id: 'hallway_sconce_01', type: 'sconce', x: 36, y: 34, width: 8, height: 10, anchor: 'top-left', layer: 'wall' },
        { id: 'hallway_sconce_02', type: 'sconce', x: 276, y: 34, width: 8, height: 10, anchor: 'top-left', layer: 'wall' }
      ],
      interactables: [],
      collision: [],
      exits: [{ id: 'hallway_to_living', x: 0, y: 146, width: 16, height: 60, to: 'living', entry: 'from_hallway' }],
      entries: {
        default: { x: 24, y: 178, direction: 'right' },
        from_living: { x: 24, y: 178, direction: 'right' },
        from_kitchen: { x: 80, y: 92, direction: 'down' },
        from_bedroom: { x: 240, y: 92, direction: 'down' }
      }
    },

    // ------------------------------------------------------------------ KITCHEN AND DINING ROOM
    kitchen: {
      name: 'Kitchen',
      width: 480, height: 300,
      cameraBounds: { x: 0, y: 0, width: 480, height: 300 },
      playerSpawn: { x: 241, y: 270, direction: 'up' },
      wall: { top: 20, base: 80, south: 288, west: 10, east: 470, southDoor: { x0: 220, x1: 262 } },
      surface: 'tile',
      walkable: [
        { x: 12, y: 82, width: 456, height: 204 },
        { x: 220, y: 286, width: 42, height: 12 }
      ],
      furniture: [
        { id: 'kitchen_refrigerator', type: 'refrigerator', x: 45, y: 90, width: 35, height: 60, solid: true, collision: { x: 28, y: 80, width: 35, height: 10 },
          interactive: true, prompt: 'Open fridge', interactionPoint: { x: 45, y: 102 }, interactionRadius: 13, facing: 'up' },
        { id: 'kitchen_counter', type: 'kitchen_counter', x: 130, y: 105, width: 110, height: 25, solid: true, collision: { x: 75, y: 88, width: 110, height: 17 } },
        { id: 'kitchen_sink', type: 'sink', x: 145, y: 88, width: 25, height: 12, on: 'kitchen_counter',
          interactive: true, prompt: 'Use sink', interactionPoint: { x: 145, y: 118 }, interactionRadius: 13, facing: 'up' },
        { id: 'kitchen_stove_base', type: 'kitchen_counter', variant: 'oven', x: 210, y: 105, width: 32, height: 25, solid: true, collision: { x: 194, y: 88, width: 32, height: 17 },
          note: 'Invented oven cabinet: the stove (x=210) lies beyond the 110px counter, so it needs its own base.' },
        { id: 'kitchen_stove', type: 'stove', x: 210, y: 88, width: 30, height: 15, on: 'kitchen_stove_base',
          interactive: true, prompt: 'Check the kettle', interactionPoint: { x: 210, y: 118 }, interactionRadius: 13, facing: 'up' },
        { id: 'kitchen_dining_table', type: 'dining_table', x: 335, y: 145, width: 95, height: 35, solid: true, collision: { x: 288, y: 124, width: 95, height: 21 },
          interactive: true, prompt: 'Examine table runner', interactionPoint: { x: 362, y: 158 }, interactionRadius: 12, facing: 'up' },
        { id: 'kitchen_chair_01', type: 'dining_chair', variant: 'right', x: 290, y: 145, width: 20, height: 22, solid: true, collision: { x: 282, y: 139, width: 12, height: 6 }, overlapOK: ['kitchen_dining_table'] },
        { id: 'kitchen_chair_02', type: 'dining_chair', variant: 'left', x: 380, y: 145, width: 20, height: 22, solid: true, collision: { x: 377, y: 139, width: 12, height: 6 }, overlapOK: ['kitchen_dining_table'] },
        { id: 'kitchen_chair_03', type: 'dining_chair', variant: 'down', x: 335, y: 110, width: 20, height: 20 },
        { id: 'kitchen_chair_04', type: 'dining_chair', variant: 'up', x: 335, y: 185, width: 20, height: 20, solid: true, collision: { x: 327, y: 179, width: 16, height: 6 },
          interactive: true, prompt: 'Sit at table', interactionPoint: { x: 335, y: 196 }, interactionRadius: 12, facing: 'up' },
        { id: 'kitchen_potted_plant', type: 'tall_plant', variant: 'big', x: 445, y: 230, width: 25, height: 35, solid: true, collision: { x: 435, y: 223, width: 20, height: 7 } }
      ],
      decorations: [
        { id: 'kitchen_wall_cabinets', type: 'wall_cabinets', x: 150, y: 45, width: 100, height: 25, anchor: 'top-center', layer: 'wall',
          note: 'Wall anchor read as top-center so the cabinets are centred over the counter and stove.' },
        { id: 'kitchen_window', type: 'curtain_window', x: 392, y: 28, width: 46, height: 34, anchor: 'top-left', layer: 'wall', note: 'Invented.' },
        { id: 'kitchen_clock', type: 'wall_clock', variant: 'small', x: 264, y: 32, width: 14, height: 14, anchor: 'top-left', layer: 'wall', note: 'Invented.' },
        { id: 'kitchen_pans', type: 'hanging_pans', x: 300, y: 36, width: 30, height: 18, anchor: 'top-left', layer: 'wall', note: 'Invented.' },
        { id: 'kitchen_rug', type: 'rug', variant: 'stripe', x: 150, y: 150, width: 90, height: 22, layer: 'floor', note: 'Invented.' }
      ],
      interactables: [],
      collision: [],
      exits: [{ id: 'kitchen_to_hallway', x: 218, y: 284, width: 46, height: 16, to: 'hallway', entry: 'from_kitchen' }],
      entries: { default: { x: 241, y: 270, direction: 'up' }, from_hallway: { x: 241, y: 270, direction: 'up' } }
    },

    // ------------------------------------------------------------------ BEDROOM AND STUDIO
    // 40 x 22 tile grid (TILE = 14px -> 560 x 308 interior + south doorway)
    bedroom: {
      name: 'Bedroom & studio',
      width: 560, height: 320,
      cameraBounds: { x: 0, y: 0, width: 560, height: 320 },
      playerSpawn: { x: 300, y: 245, direction: 'right' },
      wall: { top: 0, base: 56, south: 308, west: 10, east: 556, studioX: 364, southDoor: { x0: 280, x1: 320 } },
      surface: 'wood',
      walkable: [
        { x: 14, y: 58, width: 540, height: 248 },
        { x: 280, y: 306, width: 40, height: 12 }
      ],
      furniture: [
        // Upper-Left Wall — Bookshelf (Y: 1..5)
        { id: 'bedroom_bookshelf', type: 'bookshelf', variant: 'tall', x: 14, y: 14, width: 42, height: 70, anchor: 'top-left',
          solid: true, collision: { x: 14, y: 56, width: 42, height: 28 },
          interactive: true, prompt: 'Browse books', interactionPoint: { x: 35, y: 91 }, interactionRadius: 16, facing: 'up' },

        // Middle-Left Zone (Y: 8..11) — Shared Sleeping Area (2-tile aisle Y:6..7 above, Y:12..13 below)
        { id: 'bedroom_wardrobe', type: 'wardrobe', x: 14, y: 112, width: 42, height: 42, anchor: 'top-left',
          solid: true, collision: { x: 14, y: 132, width: 42, height: 22 },
          interactive: true, prompt: 'Open wardrobe', interactionPoint: { x: 35, y: 164 }, interactionRadius: 14, facing: 'up' },
        { id: 'bedroom_bed', type: 'bed', x: 84, y: 112, width: 70, height: 56, anchor: 'top-left',
          solid: true, collision: { x: 84, y: 120, width: 70, height: 48 },
          interactive: true, prompt: 'Straighten the blanket', interactionPoint: { x: 119, y: 176 }, interactionRadius: 16, facing: 'up' },
        { id: 'bedroom_pillow_01', type: 'pillow', x: 91, y: 128, width: 24, height: 12, anchor: 'top-left', on: 'bedroom_bed' },
        { id: 'bedroom_pillow_02', type: 'pillow', x: 121, y: 128, width: 24, height: 12, anchor: 'top-left', on: 'bedroom_bed' },
        { id: 'bedroom_bedside_table', type: 'bedside_table', x: 154, y: 112, width: 28, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 154, y: 120, width: 28, height: 20 } },
        { id: 'bedroom_bedside_lamp', type: 'bedside_lamp', x: 163, y: 98, width: 10, height: 18, anchor: 'top-left', on: 'bedroom_bedside_table',
          interactive: true, prompt: 'Switch lamp', interactionPoint: { x: 168, y: 104 }, interactionRadius: 13, facing: 'down' },
        { id: 'bedroom_teddy', type: 'teddy', x: 168, y: 140, width: 14, height: 18, anchor: 'top-left',
          interactive: true, prompt: 'Hug teddy', interactionPoint: { x: 192, y: 149 }, interactionRadius: 14, facing: 'left' },

        // Right Side — Roni's Zone (Technology Workspace)
        { id: 'studio_server_rack', type: 'server_rack', x: 392, y: 14, width: 42, height: 42, anchor: 'top-left',
          solid: false,
          interactive: true, prompt: 'Inspect server rack', interactionPoint: { x: 384, y: 91 }, interactionRadius: 12, facing: 'up' },
        { id: 'studio_printer', type: 'printer', x: 448, y: 14, width: 42, height: 42, anchor: 'top-left',
          solid: false,
          interactive: true, prompt: 'Check printer', interactionPoint: { x: 454, y: 91 }, interactionRadius: 12, facing: 'up' },
        { id: 'studio_long_desk', type: 'long_desk', x: 378, y: 56, width: 112, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 378, y: 64, width: 112, height: 20 } },
        { id: 'studio_crt_monitor', type: 'beige_crt', x: 394, y: 40, width: 38, height: 30, anchor: 'top-left', on: 'studio_long_desk' },
        { id: 'studio_second_monitor', type: 'office_monitor', variant: 'beige', x: 438, y: 42, width: 28, height: 26, anchor: 'top-left', on: 'studio_long_desk' },
        { id: 'studio_keyboard', type: 'keyboard', variant: 'beige', x: 398, y: 69, width: 34, height: 7, anchor: 'top-left', on: 'studio_long_desk' },
        { id: 'studio_archive_folders', type: 'archive_folders', x: 470, y: 50, width: 18, height: 14, anchor: 'top-left', on: 'studio_long_desk',
          interactive: true, prompt: 'Check archive folders', interactionPoint: { x: 482, y: 91 }, interactionRadius: 11, facing: 'up' },
        { id: 'studio_computer_tower', type: 'computer_tower', x: 504, y: 56, width: 14, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 504, y: 64, width: 14, height: 20 } },
        { id: 'studio_drawers', type: 'drawers', x: 532, y: 56, width: 28, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 532, y: 64, width: 28, height: 20 } },
        { id: 'studio_desk_lamp', type: 'desk_lamp', variant: 'studio', x: 540, y: 40, width: 12, height: 22, anchor: 'top-left', on: 'studio_drawers',
          interactive: true, prompt: 'Switch lamp', interactionPoint: { x: 542, y: 91 }, interactionRadius: 14, facing: 'up' },
        { id: 'studio_desk_chair', type: 'desk_chair', variant: 'up', x: 420, y: 98, width: 28, height: 28, anchor: 'top-left', solid: false },

        // Bottom-Left Corner (Y: 14..21) — Kallita's Creative Equipment (Art & Music, 2+ tile aisles)
        { id: 'bedroom_vinyl_shelf', type: 'vinyl_shelf', x: 14, y: 196, width: 28, height: 42, anchor: 'top-left',
          solid: true, collision: { x: 14, y: 220, width: 28, height: 18 },
          interactive: true, prompt: 'Flip through vinyls', interactionPoint: { x: 28, y: 248 }, interactionRadius: 14, facing: 'up' },
        { id: 'bedroom_easel', type: 'easel', x: 70, y: 196, width: 42, height: 42, anchor: 'top-left',
          solid: true, collision: { x: 70, y: 218, width: 42, height: 20 },
          interactive: true, prompt: 'Look at painting', interactionPoint: { x: 91, y: 248 }, interactionRadius: 14, facing: 'up' },
        { id: 'bedroom_art_table', type: 'art_table', x: 140, y: 210, width: 70, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 140, y: 220, width: 70, height: 18 },
          interactive: true, prompt: 'Examine paints', interactionPoint: { x: 175, y: 248 }, interactionRadius: 14, facing: 'up' },
        { id: 'bedroom_paint_supplies', type: 'paint_supplies', x: 161, y: 202, width: 28, height: 14, anchor: 'top-left', on: 'bedroom_art_table' },
        { id: 'bedroom_guitar', type: 'guitar', x: 14, y: 280, width: 28, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 16, y: 292, width: 24, height: 16 },
          interactive: true, prompt: 'Strum guitar', interactionPoint: { x: 28, y: 272 }, interactionRadius: 12, facing: 'down' },
        { id: 'bedroom_music_keyboard', type: 'music_keyboard', x: 70, y: 280, width: 56, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 70, y: 292, width: 56, height: 16 },
          interactive: true, prompt: 'Play keyboard', interactionPoint: { x: 98, y: 272 }, interactionRadius: 14, facing: 'down' },
        { id: 'bedroom_amplifier', type: 'amplifier', x: 154, y: 280, width: 28, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 154, y: 292, width: 28, height: 16 },
          interactive: true, prompt: 'Check amplifier', interactionPoint: { x: 168, y: 272 }, interactionRadius: 12, facing: 'down' },
        { id: 'bedroom_electric_guitar', type: 'electric_guitar', x: 196, y: 280, width: 28, height: 28, anchor: 'top-left',
          solid: true, collision: { x: 198, y: 292, width: 24, height: 16 },
          interactive: true, prompt: 'Play electric guitar', interactionPoint: { x: 210, y: 272 }, interactionRadius: 12, facing: 'down' }
      ],
      decorations: [
        // Wall-mounted upper wall objects (Y = 1..3 -> y = 14..56, flush on wall)
        { id: 'bedroom_poster', type: 'poster', x: 84, y: 14, width: 28, height: 42, anchor: 'top-left', layer: 'wall',
          interactive: true, prompt: 'Look at poster', interactionPoint: { x: 98, y: 66 }, interactionRadius: 16, facing: 'up' },
        { id: 'bedroom_window', type: 'curtain_window', x: 154, y: 14, width: 42, height: 42, anchor: 'top-left', layer: 'wall' },
        { id: 'studio_corkboard', type: 'corkboard', x: 308, y: 14, width: 56, height: 42, anchor: 'top-left', layer: 'wall',
          interactive: true, prompt: 'Look at corkboard', interactionPoint: { x: 336, y: 66 }, interactionRadius: 16, facing: 'up' },
        // Center Shared Neutral Rug
        { id: 'bedroom_rug', type: 'rug', variant: 'round', x: 238, y: 168, width: 98, height: 56, anchor: 'top-left', layer: 'floor' }
      ],
      interactables: [
        { id: 'studio_computer', type: 'zone', x: 434, y: 112, width: 28, height: 28, anchor: 'bottom-center',
          interactive: true, prompt: 'Turn on computer', interactionPoint: { x: 434, y: 112 }, interactionRadius: 18, facing: 'up', essential: true }
      ],
      collision: [],
      exits: [{ id: 'bedroom_to_hallway', x: 278, y: 302, width: 44, height: 18, to: 'hallway', entry: 'from_bedroom' }],
      entries: { default: { x: 300, y: 245, direction: 'right' }, from_hallway: { x: 300, y: 290, direction: 'up' } }
    }
  };

  // ------------------------------------------------------------------ Per-scene character spawns and marks
  // Every scene defines every character that appears in it. Marks are named world positions used by scripts.
  const SCENE_LAYOUTS = {
      s01_office: {
      room: 'office',
      characters: {
        roni: { x: 180, y: 151, direction: 'up', state: 'idle', expression: 'neutral', outfit: 'roni_office', visible: true, controllable: true },
        clara: { x: 80, y: 151, direction: 'up', state: 'sitting', expression: 'happy', outfit: 'office_charcoal', visible: true, controllable: false },
        penguin: { x: 345, y: 151, direction: 'up', state: 'idle', expression: 'neutral', visible: true, controllable: false },
        barnaby: { x: 262, y: 130, direction: 'right', state: 'idle', expression: 'happy', outfit: 'office_navy', visible: true, controllable: false },
        miles: { x: 282, y: 130, direction: 'left', state: 'idle', expression: 'neutral', outfit: 'office_slate', visible: true, controllable: false }
      },
      marks: { focus_window: { x: 80, y: 40 }, camera_desk: { x: 180, y: 118 }, penguin_stop: { x: 215, y: 148 }, elevator_inside: { x: 455, y: 141 } }
    },
    s02_street: {
      room: 'street',
      characters: {
        roni: { x: 45, y: 207, direction: 'right', state: 'walking', expression: 'neutral', outfit: 'roni_office', carrying: ['work_bag'], visible: true, controllable: true },
        felix: { x: 218, y: 204, direction: 'right', state: 'idle', expression: 'happy', visible: true, controllable: false },
        clover: { x: 238, y: 204, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false },
        pip: { x: 514, y: 183, direction: 'up', state: 'idle', expression: 'happy', visible: true, controllable: false },
        maple: { x: 405, y: 196, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false },
        hazel: { x: 608, y: 210, direction: 'right', state: 'idle', expression: 'happy', visible: true, controllable: false },
        pippin: { x: 626, y: 210, direction: 'left', state: 'idle', expression: 'excited', visible: true, controllable: false },
        bruno: { x: 118, y: 212, direction: 'right', state: 'idle', expression: 'happy', visible: true, controllable: false },
        pippa: { x: 136, y: 212, direction: 'left', state: 'idle', expression: 'excited', visible: true, controllable: false },
        jun: { x: 318, y: 200, direction: 'right', state: 'idle', expression: 'tender', visible: true, controllable: false },
        mina: { x: 334, y: 200, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false },
        theo: { x: 765, y: 204, direction: 'right', state: 'idle', expression: 'tender', visible: true, controllable: false },
        rosie: { x: 781, y: 204, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false }
      },
      marks: { shop_door: { x: 730, y: 178 }, bench_seat: { x: 575, y: 171 } }
    },
    s03_shop: {
      room: 'shop',
      characters: {
        roni: { x: 65, y: 190, direction: 'right', state: 'idle', expression: 'happy', outfit: 'roni_office', carrying: ['work_bag'], visible: true, controllable: true },
        owl: { x: 385, y: 128, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false }
      },
      marks: { talk_spot: { x: 365, y: 158 }, owl_counter: { x: 365, y: 128 }, owl_standby: { x: 385, y: 128 }, owl_wrap: { x: 340, y: 113 }, bouquet: { x: 340, y: 120 } }
    },
    s04_street_night: {
      room: 'street',
      characters: {
        roni: { x: 730, y: 182, direction: 'right', state: 'idle', expression: 'neutral', outfit: 'roni_office', carrying: ['work_bag', 'bouquet'], visible: true, controllable: true },
        owl: { x: 752, y: 182, direction: 'up', state: 'idle', expression: 'neutral', visible: true, controllable: false },
        otto: { x: 496, y: 184, direction: 'right', state: 'idle', expression: 'neutral', visible: true, controllable: false },
        willow: { x: 512, y: 184, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false },
        bramble: { x: 542, y: 186, direction: 'down', state: 'idle', expression: 'neutral', visible: true, controllable: false },
        milo: { x: 584, y: 185, direction: 'down', state: 'idle', expression: 'neutral', visible: true, controllable: false },
        koda: { x: 352, y: 202, direction: 'right', state: 'idle', expression: 'tender', visible: true, controllable: false },
        lumi: { x: 370, y: 202, direction: 'left', state: 'idle', expression: 'happy', visible: true, controllable: false },
        sage: { x: 218, y: 210, direction: 'right', state: 'idle', expression: 'happy', visible: true, controllable: false },
        pebble: { x: 236, y: 210, direction: 'left', state: 'idle', expression: 'excited', visible: true, controllable: false }
      },
      marks: { home_edge: { x: 935, y: 207 }, owl_inside: { x: 730, y: 129 }, owl_sidewalk: { x: 730, y: 184 }, owl_exit: { x: 380, y: 184 }, bus_stop_curb: { x: 506, y: 222 } }
    },
    s05_porch: {
      room: 'porch',
      characters: {
        roni: { x: 160, y: 192, direction: 'up', state: 'idle', expression: 'happy', outfit: 'roni_office', carrying: ['work_bag', 'bouquet'], visible: true, controllable: true }
      },
      marks: { door_front: { x: 160, y: 148 }, porch_inside: { x: 160, y: 130 } }
    },
    s05_arrival: {
      room: 'living',
      characters: {
        roni: { x: 35, y: 235, direction: 'right', state: 'walking', expression: 'neutral', outfit: 'roni_office', carrying: ['work_bag', 'bouquet'], visible: true, controllable: true },
        kallita: { x: 285, y: 112, direction: 'left', state: 'hidden', expression: 'excited', outfit: 'kallita_casual', visible: false, controllable: false }
      },
      marks: { kallita_surprise: { x: 230, y: 148 }, roni_surprise: { x: 175, y: 160 }, surprise_trigger: { x: 150, y: 100, width: 110, height: 120 } }
    },
    s06_outfit: {
      room: 'living',
      characters: {
        roni: { x: 175, y: 160, direction: 'right', state: 'idle', expression: 'neutral', outfit: 'roni_office', carrying: ['work_bag'], visible: true, controllable: true },
        kallita: { x: 230, y: 145, direction: 'left', state: 'idle', expression: 'happy', outfit: 'kallita_casual', visible: true, controllable: false }
      },
      marks: { kallita_vase: { x: 197, y: 164 }, coat_rack_front: { x: 42, y: 224 } }
    },
    s07_party: {
      room: 'living',
      characters: {
        roni: { x: 60, y: 228, direction: 'right', state: 'idle', expression: 'neutral', outfit: 'roni_casual', visible: true, controllable: true },
        kallita: { x: 228, y: 210, direction: 'left', state: 'idle', expression: 'excited', outfit: 'kallita_casual', visible: true, controllable: false }
      },
      marks: {
        roni_cake: { x: 141, y: 205 }, kallita_cake: { x: 159, y: 205 },
        roni_sofa: { x: 156, y: 139 }, kallita_sofa: { x: 186, y: 139 },
        roni_sofa_front: { x: 156, y: 162 }, kallita_sofa_front: { x: 186, y: 162 },
        roni_table: { x: 165, y: 211 }, kallita_table: { x: 192, y: 211 },
        roni_presents: { x: 138, y: 163 }, kallita_presents: { x: 202, y: 163 },
        tripod_pickup: { x: 342, y: 102 }, tripod_spot: { x: 170, y: 226 },
        roni_selfie_entry: { x: 152, y: 160 }, kallita_selfie_entry: { x: 188, y: 160 },
        roni_selfie: { x: 160, y: 160 }, kallita_selfie: { x: 180, y: 160 }
      }
    },
    s08_album: {
      room: 'living',
      characters: {
        roni: { x: 160, y: 157, direction: 'right', state: 'idle', expression: 'neutral', outfit: 'roni_casual', visible: true, controllable: false },
        kallita: { x: 182, y: 157, direction: 'left', state: 'idle', expression: 'happy', outfit: 'kallita_casual', visible: true, controllable: false }
      },
      marks: {
        kallita_shelf: { x: 310, y: 106 }, roni_table: { x: 160, y: 211 }, kallita_table: { x: 185, y: 211 }, album_focus: { x: 173, y: 178 }
      }
    },
    s09_studio: {
      room: 'bedroom',
      characters: {
        roni: { x: 300, y: 245, direction: 'right', state: 'idle', expression: 'curious', outfit: 'roni_casual', visible: true, controllable: true }
      },
      marks: { computer_seat: { x: 434, y: 114 }, chair_back: { x: 434, y: 124 }, camera_desk: { x: 434, y: 74 } },
      others: { kitchen: { kallita: { x: 210, y: 124, direction: 'up', state: 'idle', expression: 'happy', outfit: 'kallita_casual', visible: true, controllable: false } } }
    },
    s10_finale: {
      room: 'living',
      characters: {
        roni: { x: 450, y: 225, direction: 'left', state: 'idle', expression: 'determined', outfit: 'roni_casual', visible: true, controllable: true },
        kallita: { x: 300, y: 120, direction: 'down', state: 'hidden', expression: 'shy', outfit: 'kallita_casual', visible: false, controllable: false }
      },
      marks: { kallita_enter: { x: 455, y: 225 }, tripod_spot: { x: 170, y: 218 }, roni_selfie: { x: 160, y: 160 }, kallita_selfie: { x: 180, y: 160 }, album_focus: { x: 170, y: 178 } },
      note: 'Finale uses the Section 24 selfie positions, not the previously invented proposal marks: the supplied story ends with the visitor in a thirteenth photograph.'
    }
  };

  window.WORLD_LAYOUTS = WORLD_LAYOUTS;
  window.SCENE_LAYOUTS = SCENE_LAYOUTS;
})();
