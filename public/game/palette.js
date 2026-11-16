// Shared pixel-art palette. Loaded by the browser (window.PALETTE) and by tools/generate_photos.js (module.exports).
(function (root) {
  const PALETTE = {
    outline: '#2a1e2e',
    outlineSoft: '#4a3a4e',
    shadow: 'rgba(30,18,36,0.28)',
    white: '#fbf7f2',
    black: '#1a1420',

    roni: {
      fur: '#55515c', furShade: '#3d3945', furLight: '#716b79',
      muzzle: '#eadbc9', earInner: '#c98591', eye: '#18141c',
      nose: '#d9879a', tail: '#b98594', ribbon: '#d6a64d', ribbonDark: '#987336', hair: '#55515c'
    },
    kallita: {
      fur: '#2d2a35', furShade: '#191721', furLight: '#4b4658',
      muzzle: '#423c4a', earInner: '#c98591', eye: '#f4d36c',
      nose: '#d9879a', tailTip: '#2d2a35'
    },
    kei: {
      fur: '#2d2a35', furShade: '#191721', furLight: '#4b4658',
      muzzle: '#423c4a', earInner: '#c98591', eye: '#f4d36c',
      nose: '#d9879a', tailTip: '#2d2a35'
    },
    penguin: {
      body: '#2d3142', bodyShade: '#1f2230', belly: '#f2f0ea', bellyShade: '#d3d0c8',
      beak: '#f0a03c', feet: '#e88b2e', tie: '#c2453f', glasses: '#c9d6e8'
    },
    owl: {
      body: '#8a6545', bodyShade: '#6a4b33', belly: '#d9c3a0', bellyShade: '#bfa37e',
      eyeRing: '#f2d16b', beak: '#e1a43c', apron: '#5f8a5a', apronShade: '#486b44'
    },
    rabbit: {
      fur: '#e8d9c3', furShade: '#c9b79d', muzzle: '#fbf4ea', earInner: '#efb3b8',
      eye: '#3a2c2c', nose: '#d98a8f'
    },
    bear: {
      fur: '#8a5c3c', furShade: '#6b4429', muzzle: '#d8b48c', earInner: '#b8835a',
      eye: '#2a1e1e', nose: '#2a1e1e'
    },
    seal: {
      fur: '#b6bfc9', furShade: '#8c96a4', furLight: '#d9e0e8',
      muzzle: '#eef2f5', earInner: '#8c96a4', eye: '#1a1922',
      nose: '#3a3c48', tailTip: '#8c96a4'
    },
    fox: {
      fur: '#d96b38', furShade: '#a64822', furLight: '#f08b55',
      muzzle: '#fbf2e4', earInner: '#f3b7c0', earTip: '#2e242b',
      eye: '#2a1e2e', nose: '#241b22', tailTip: '#fbf2e4'
    },
    dog: {
      fur: '#dfad64', furShade: '#b58442', furLight: '#f2c985',
      muzzle: '#fbf3e2', earInner: '#b58442',
      eye: '#2a1e1e', nose: '#2a1e1e', tailTip: '#fbf3e2'
    },
    frog: {
      fur: '#68a65a', furShade: '#4a7d41', furLight: '#89c478',
      muzzle: '#d9ebbf', earInner: '#d9ebbf',
      eye: '#1a1922', nose: '#4a7d41'
    },
    deer: {
      fur: '#c98856', furShade: '#9c633b', furLight: '#e0a575',
      muzzle: '#f7ebd8', earInner: '#efb3b8',
      eye: '#2a1e1e', nose: '#3a2420'
    },
    raccoon: {
      fur: '#7e8694', furShade: '#575f6d', furLight: '#a1a9b8',
      muzzle: '#e8eaee', earInner: '#c8cdd6', mask: '#2b2d38',
      eye: '#1a1922', nose: '#24262e', tailTip: '#2b2d38'
    },
    squirrel: {
      fur: '#b55f3b', furShade: '#853f24', furLight: '#d47c54',
      muzzle: '#f5e2cb', earInner: '#e8a298',
      eye: '#241a18', nose: '#3b2420', tailTip: '#f5e2cb'
    },
    hedgehog: {
      fur: '#a37b5e', furShade: '#5c4033', furLight: '#c49d7e',
      muzzle: '#f2e0cd', earInner: '#efb3b8', quills: '#4d352a', quillTip: '#e6d3bd',
      eye: '#241a18', nose: '#2e1e1c'
    },
    otter: {
      fur: '#8c6244', furShade: '#66432b', furLight: '#ad8260',
      muzzle: '#f2e2ce', earInner: '#d4a38a',
      eye: '#1c1518', nose: '#2c1e1c', tailTip: '#66432b'
    },
    koala: {
      fur: '#8c96a4', furShade: '#667080', furLight: '#b0bac7',
      muzzle: '#e6eaef', earInner: '#f0e2dc',
      eye: '#1f1c24', nose: '#2d2a35'
    },
    redpanda: {
      fur: '#c95a32', furShade: '#8c361a', furLight: '#e37b52',
      muzzle: '#fbf0e0', earInner: '#f5ded0', mask: '#5c2618',
      eye: '#20181a', nose: '#241a1a', tailTip: '#7a2e16'
    },
    badger: {
      fur: '#585c68', furShade: '#3a3e48', furLight: '#7c8290',
      muzzle: '#f2f0ea', earInner: '#c8c6c2', stripe: '#f4f2ec', mask: '#272932',
      eye: '#1a1922', nose: '#201f26'
    },
    panda: {
      fur: '#f5f1e8', furShade: '#cfc8bc', furLight: '#ffffff',
      muzzle: '#fbf8f2', earInner: '#363442', mask: '#262430',
      eye: '#1a1922', nose: '#24222c', tailTip: '#262430'
    },
    lamb: {
      fur: '#f7efe2', furShade: '#d8cbb8', furLight: '#fffaf2',
      muzzle: '#b8947e', earInner: '#f0b8c0',
      eye: '#261e1c', nose: '#4a322e'
    },
    capybara: {
      fur: '#a4724a', furShade: '#7a5032', furLight: '#bf8b62',
      muzzle: '#c99c72', earInner: '#6b442b',
      eye: '#1f1816', nose: '#33221c'
    },
    quokka: {
      fur: '#c99760', furShade: '#9c6e40', furLight: '#e0b27c',
      muzzle: '#f2e2c9', earInner: '#e6a8aa',
      eye: '#241a18', nose: '#3b2420', tailTip: '#9c6e40'
    },

    outfits: {
      roni_office: { formal: true, top: '#34394d', topShade: '#252938', topLight: '#4c536b', shirt: '#fff0dc', tie: '#b74350', bottom: '#464858', bottomShade: '#30323f', shoe: '#654438' },
      office_charcoal: { formal: true, top: '#3c4152', topShade: '#2b2f3d', topLight: '#565d75', shirt: '#f4efe6', tie: '#9e4b64', bottom: '#2f3342', bottomShade: '#212430', shoe: '#2b2522' },
      office_navy: { formal: true, top: '#2f415e', topShade: '#212f46', topLight: '#465e85', shirt: '#f8f4ec', tie: '#a83b46', bottom: '#243046', bottomShade: '#192233', shoe: '#2b2522' },
      office_slate: { formal: true, top: '#4a5364', topShade: '#353c4a', topLight: '#657085', shirt: '#f8f4ec', tie: '#3e6e7a', bottom: '#343946', bottomShade: '#252934', shoe: '#2b2522' },
      roni_casual: { top: '#d6a64d', topShade: '#a87d36', topLight: '#ebc875', shirt: '#fff0dc', bottom: '#676073', bottomShade: '#484353', shoe: '#d9c9b5' },
      kallita_casual: { top: '#f1dcc5', topShade: '#c6b69f', topLight: '#fff0dc', shirt: '#d6a64d', bottom: '#536f91', bottomShade: '#394f6d', shoe: '#c5b8a8', string: '#80605b' },
      kei_casual: { top: '#f1dcc5', topShade: '#c6b69f', topLight: '#fff0dc', shirt: '#d6a64d', bottom: '#536f91', bottomShade: '#394f6d', shoe: '#c5b8a8', string: '#80605b' },
      rabbit_coat: { top: '#e9c33f', topShade: '#c39d27', topLight: '#f5db76', shirt: '#e9c33f', bottom: '#5e5a72', bottomShade: '#47445a', shoe: '#3b3242' },
      bear_scarf: { top: '#7b8794', topShade: '#5f6a76', topLight: '#99a5b2', shirt: '#7b8794', bottom: '#3f4656', bottomShade: '#2f3542', shoe: '#2b2522', scarf: '#3f78b5' },
      city_emerald: { top: '#3b6e5c', topShade: '#284d40', topLight: '#56917c', shirt: '#f4ecdc', bottom: '#383d4d', bottomShade: '#262a36', shoe: '#453129' },
      city_burgundy: { top: '#8c3d4c', topShade: '#662935', topLight: '#ad5868', shirt: '#f8f0e4', bottom: '#434a59', bottomShade: '#2e333f', shoe: '#3b2b28', scarf: '#e6b85c' },
      city_ochre: { top: '#d49a3a', topShade: '#a37122', topLight: '#ebc065', shirt: '#fbf4ea', bottom: '#44586e', bottomShade: '#2f3f52', shoe: '#4a3a30' },
      city_plum: { top: '#7a5a85', topShade: '#593f63', topLight: '#9c7aa8', shirt: '#f6eef8', bottom: '#3d4454', bottomShade: '#2b303c', shoe: '#382a30', scarf: '#e8a0b0' },
      night_teal: { top: '#2f5866', topShade: '#1f3e48', topLight: '#497a8a', shirt: '#e6eef2', bottom: '#272c38', bottomShade: '#191d26', shoe: '#241f26', scarf: '#d98c54' },
      night_rust: { top: '#944a38', topShade: '#6b3224', topLight: '#b56652', shirt: '#f4eadc', bottom: '#323644', bottomShade: '#21242f', shoe: '#2e2422', scarf: '#e8d4a8' },
      night_indigo: { top: '#434c78', topShade: '#2e3557', topLight: '#5f6a9e', shirt: '#ede9f5', bottom: '#262836', bottomShade: '#181a24', shoe: '#242029', scarf: '#88b8a8' }
    },

    props: {
      bag: '#8a5a3a', bagShade: '#6a4129', bagLight: '#a8754e', bagStrap: '#5b3a26',
      phone: '#2b2d3a', phoneScreen: '#9fd6ff',
      wrapKraft: '#d4a873', wrapKraftShade: '#b08655', wrapPink: '#f1b7c6', ribbon: '#d6455a',
      sunflower: '#f4c430', sunflowerDark: '#c48a12', sunCenter: '#6b3f1f',
      peony: '#f39bb6', peonyLight: '#fbd0dd', peonyDark: '#d3678a',
      tulip: '#e8574a', leaf: '#5d9a4f', leafDark: '#3f6f37',
      camera: '#e9e3d6', cameraDark: '#3a3540', album: '#7a3e3e', albumGold: '#e6c46a',
      knife: '#d8dde6', pizzaCheese: '#f4c430', pizzaCrust: '#e0a868', pizzaSauce: '#d6455a'
    },

    office: {
      wall: '#cfd3d6', wallShade: '#b6bbc0', wallLight: '#e1e4e6', trim: '#8c939b',
      carpet: '#7b8796', carpetDark: '#6c7787', carpetLight: '#8995a3',
      wood: '#9b6b46', woodShade: '#7a5136', woodLight: '#b8875d',
      metal: '#9aa3ad', metalShade: '#727b86', metalLight: '#c3cad2',
      screen: '#2f4a5a', screenGlow: '#8fd3ff', window: '#f2b37a', windowFar: '#e88d62'
    },
    street: {
      skySunset: ['#4a3a6e', '#8c4f7a', '#e2775f', '#f6b26b'],
      skyNight: ['#0f1430', '#1d2450', '#2d3566', '#3e4a7a'],
      buildingFar: '#5a4a6e', buildingFarNight: '#22284a',
      brick: '#a35a48', brickShade: '#7f4436', brickLight: '#c27360',
      plaster: '#e9d7b8', plasterShade: '#c8b394',
      sidewalk: '#b9b2a8', sidewalkShade: '#9e978d', sidewalkLight: '#cfc9bf', curb: '#86807a',
      road: '#4a4650', roadShade: '#3c3842', roadLine: '#e8e2d4',
      lampPost: '#3a3a48', lampLight: '#ffe3a1', grass: '#5f8f4e', grassDark: '#477538',
      treeLeaf: '#4f8a46', treeLeafDark: '#3a6a34', treeLeafLight: '#6aa85a', trunk: '#6b4a33'
    },
    shop: {
      wall: '#cfe3cf', wallStripe: '#bdd6be', wallShade: '#a9c6ab', trim: '#f4ecdc',
      floor: '#c98f62', floorShade: '#a9734b', floorLight: '#dba67a',
      wood: '#8c5a3c', woodShade: '#6b412a', woodLight: '#ab7652',
      bucket: '#9aa6b3', bucketShade: '#768291', sign: '#f4ecdc', signText: '#5f8a5a'
    },
    living: {
      wall: '#e8c9a8', wallShade: '#d1ad89', wallPattern: '#dcb894', trim: '#8a5a3c', trimLight: '#a8754e',
      floor: '#a8714a', floorShade: '#8c5b3a', floorLight: '#bd855b', floorGap: '#734a2f',
      rug: '#b84e4e', rugShade: '#943d3d', rugPattern: '#e6b45a',
      sofa: '#5f7f9e', sofaShade: '#486684', sofaLight: '#7a9bba',
      wood: '#7a4f33', woodShade: '#5c3a24', woodLight: '#99674a'
    },
    kitchen: {
      wall: '#f1e7d0', wallShade: '#dccfb2', tile: '#e8f1f3', tileShade: '#c9d8dc',
      floorA: '#e9e3d6', floorB: '#b9c3c9', floorShade: '#a3adb4',
      counter: '#d9d2c4', counterTop: '#7b7f8a', cabinet: '#8fb0a8', cabinetShade: '#6f9088',
      fridge: '#e8ecef', fridgeShade: '#c4cbd1', runner: '#3d5f8a', runnerDot: '#fbf7f2'
    },
    bedroom: {
      wall: '#c9bfdc', wallShade: '#ada2c4', wallPattern: '#bcb1d2',
      studioWall: '#8d9cc0', studioWallShade: '#76859f',
      floor: '#b98a63', floorShade: '#9a6f4c', floorLight: '#cc9e77', floorGap: '#80593c',
      rug: '#e7d6a8', rugShade: '#cbb886', rugPattern: '#b2645c',
      bedSheet: '#f1ece2', bedSheetShade: '#d6cfc0', blanket: '#7f9fc4', blanketShade: '#6383a8',
      crt: '#d9d0b8', crtShade: '#b9ae93', crtScreen: '#1c2b2a', crtGlow: '#7cf2c4'
    },
    hallway: {
      wall: '#e3d3b8', wallShade: '#c9b797', wainscot: '#8a6a4c', wainscotLight: '#a3825f',
      floor: '#9b6c48', floorShade: '#80573a', floorLight: '#b07f58', runner: '#6a4a7a', runnerPattern: '#d9b45a'
    },

    ui: {
      bg: '#1d1626', panel: '#2b2236', panelLight: '#3c3048', text: '#f3ead8', accent: '#f0a6b8', accent2: '#8fd3c4', warn: '#f2c35c', bad: '#e06a6a', good: '#7fd48a'
    }
  };

  root.PALETTE = PALETTE;
  if (typeof module !== 'undefined' && module.exports) module.exports = PALETTE;
})(typeof window !== 'undefined' ? window : globalThis);

