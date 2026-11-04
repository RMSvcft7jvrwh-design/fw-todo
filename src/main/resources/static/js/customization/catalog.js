(() => {
    // IDs are stored in todo-appearance-v1. Keep them stable after publishing.
    window.AppearanceCatalog = Object.freeze({
        wallpaper: {
            label: '壁紙',
            defaultId: 'sky',
            choices: [
                {
                    id: 'sky',
                    label: '青空・雲・地面',
                    images: { day: '/assets/bg/day.png', night: '/assets/bg/night.png' },
                    previewClass: 'settings-preview--sky'
                },
                {
                    id: 'simple',
                    label: 'シンプル背景',
                    images: {},
                    previewClass: 'settings-preview--simple'
                }
            ]
        },
        board: {
            label: 'Todo一覧の掲示板',
            defaultId: 'japanese',
            choices: [
                {
                    id: 'japanese',
                    label: '和風木製掲示板',
                    images: { main: '/images/japanese-board.png' },
                    previewClass: 'settings-preview--board'
                },
                {
                    id: 'plain',
                    label: '通常の一覧',
                    images: {},
                    previewClass: 'settings-preview--plain'
                }
            ]
        },
        pet: {
            label: 'ペット',
            defaultId: 'meka-sakiko',
            legacyIds: { show: 'meka-sakiko' },
            choices: [
                {
                    id: 'meka-sakiko',
                    label: 'メカ祥子を表示',
                    images: {
                        sprite: '/assets/pet/meka-sakiko.png',
                        grabbed: '/assets/pet/tumarare.PNG'
                    },
                    sprite: {
                        viewport: { width: 124, height: 178 },
                        frames: {
                            walk: {
                                right: [
                                    [27, 190, 117, 178], [199, 190, 116, 178], [370, 190, 118, 178], [540, 190, 122, 178],
                                    [713, 190, 120, 178], [884, 190, 121, 178], [1057, 190, 119, 178], [1230, 190, 116, 178]
                                ],
                                left: [
                                    [28, 377, 116, 177], [200, 377, 116, 177], [371, 377, 118, 177], [541, 377, 122, 177],
                                    [714, 377, 120, 177], [886, 377, 120, 177], [1058, 377, 119, 177], [1231, 377, 116, 177]
                                ]
                            }
                        }
                    },
                    previewClass: 'settings-preview--pet'
                },
                {
                    id: 'hide',
                    label: 'メカ祥子を非表示',
                    images: {},
                    previewClass: 'settings-preview--no-pet'
                }
            ]
        }
    });
})();
