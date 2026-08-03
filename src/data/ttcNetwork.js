export const networkMetadata = Object.freeze({
  "id": "ttc-subway",
  "name": "Toronto TTC subway",
  "coordinateSystem": "schematic-from-GTFS-coordinates",
  "isPrototype": false,
  "source": "TTC Routes and Schedules GTFS via Toronto Open Data"
})

export const lines = [
  {
    "id": "line-1",
    "shortName": "1",
    "name": "Line 1 (Yonge-University)",
    "color": "#D5C82B",
    "textColor": "#000000",
    "orderedStationIds": [
      "finch",
      "north-york-centre",
      "sheppard-yonge",
      "york-mills",
      "lawrence",
      "eglinton",
      "davisville",
      "st-clair",
      "summerhill",
      "rosedale",
      "yonge",
      "wellesley",
      "college",
      "tmu",
      "queen",
      "king",
      "union",
      "st-andrew",
      "osgoode",
      "st-patrick",
      "queen-s-park",
      "museum",
      "st-george",
      "spadina",
      "dupont",
      "st-clair-west",
      "cedarvale",
      "glencairn",
      "lawrence-west",
      "yorkdale",
      "wilson",
      "sheppard-west",
      "downsview-park",
      "finch-west",
      "york-university",
      "pioneer-village",
      "highway-407",
      "vaughan-metropolitan-centre-station"
    ],
    "officialRouteId": "1"
  },
  {
    "id": "line-2",
    "shortName": "2",
    "name": "Line 2 (Bloor - Danforth)",
    "color": "#008000",
    "textColor": "#FFFFFF",
    "orderedStationIds": [
      "kipling",
      "islington",
      "royal-york",
      "old-mill",
      "jane",
      "runnymede",
      "high-park",
      "keele",
      "dundas-west",
      "lansdowne",
      "dufferin",
      "ossington",
      "christie",
      "bathurst",
      "spadina",
      "st-george",
      "bay",
      "yonge",
      "sherbourne",
      "castle-frank",
      "broadview",
      "chester",
      "pape",
      "donlands",
      "greenwood",
      "coxwell",
      "woodbine",
      "main-street",
      "victoria-park",
      "warden",
      "kennedy-station"
    ],
    "officialRouteId": "2"
  },
  {
    "id": "line-4",
    "shortName": "4",
    "name": "Line 4 (Sheppard)",
    "color": "#B300B3",
    "textColor": "#FFFFFF",
    "orderedStationIds": [
      "sheppard-yonge",
      "bayview",
      "bessarion",
      "leslie",
      "don-mills-station"
    ],
    "officialRouteId": "4"
  }
]

export const stations = [
  {
    "id": "finch",
    "name": "Finch",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "14111",
    "officialStopIds": [
      "14111"
    ],
    "position": {
      "x": 480,
      "y": 100
    },
    "labelPlacement": "right"
  },
  {
    "id": "north-york-centre",
    "name": "North York Centre",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13789",
    "officialStopIds": [
      "13789"
    ],
    "position": {
      "x": 491,
      "y": 142
    },
    "labelPlacement": "right"
  },
  {
    "id": "sheppard-yonge",
    "name": "Sheppard-Yonge",
    "lineIds": [
      "line-1",
      "line-4"
    ],
    "officialStopId": "13860",
    "officialStopIds": [
      "13860",
      "13862"
    ],
    "position": {
      "x": 498,
      "y": 163
    },
    "labelPlacement": "top-right",
    "interchange": {
      "lineIds": [
        "line-1",
        "line-4"
      ]
    }
  },
  {
    "id": "york-mills",
    "name": "York Mills",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13792",
    "officialStopIds": [
      "13792"
    ],
    "position": {
      "x": 514,
      "y": 221
    },
    "labelPlacement": "right"
  },
  {
    "id": "lawrence",
    "name": "Lawrence",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13793",
    "officialStopIds": [
      "13793"
    ],
    "position": {
      "x": 526,
      "y": 279
    },
    "labelPlacement": "right"
  },
  {
    "id": "eglinton",
    "name": "Eglinton",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13795",
    "officialStopIds": [
      "13795"
    ],
    "position": {
      "x": 538,
      "y": 346
    },
    "labelPlacement": "right"
  },
  {
    "id": "davisville",
    "name": "Davisville",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13798",
    "officialStopIds": [
      "13798"
    ],
    "position": {
      "x": 545,
      "y": 371
    },
    "labelPlacement": "right"
  },
  {
    "id": "st-clair",
    "name": "St Clair",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13799",
    "officialStopIds": [
      "13799"
    ],
    "position": {
      "x": 558,
      "y": 403
    },
    "labelPlacement": "right"
  },
  {
    "id": "summerhill",
    "name": "Summerhill",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13802",
    "officialStopIds": [
      "13802"
    ],
    "position": {
      "x": 565,
      "y": 420
    },
    "labelPlacement": "right"
  },
  {
    "id": "rosedale",
    "name": "Rosedale",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13803",
    "officialStopIds": [
      "13803",
      "13864"
    ],
    "position": {
      "x": 575,
      "y": 440
    },
    "labelPlacement": "right"
  },
  {
    "id": "wellesley",
    "name": "Wellesley",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13806",
    "officialStopIds": [
      "13806"
    ],
    "position": {
      "x": 590,
      "y": 476
    },
    "labelPlacement": "right"
  },
  {
    "id": "college",
    "name": "College",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13807",
    "officialStopIds": [
      "13807"
    ],
    "position": {
      "x": 593,
      "y": 492
    },
    "labelPlacement": "right"
  },
  {
    "id": "tmu",
    "name": "TMU",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13810",
    "officialStopIds": [
      "13810"
    ],
    "position": {
      "x": 600,
      "y": 505
    },
    "labelPlacement": "right"
  },
  {
    "id": "queen",
    "name": "Queen",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13811",
    "officialStopIds": [
      "13811"
    ],
    "position": {
      "x": 605,
      "y": 518
    },
    "labelPlacement": "right"
  },
  {
    "id": "king",
    "name": "King",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13814",
    "officialStopIds": [
      "13814"
    ],
    "position": {
      "x": 610,
      "y": 530
    },
    "labelPlacement": "right"
  },
  {
    "id": "union",
    "name": "Union",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13815",
    "officialStopIds": [
      "13815"
    ],
    "position": {
      "x": 597,
      "y": 539
    },
    "labelPlacement": "right"
  },
  {
    "id": "st-andrew",
    "name": "St Andrew",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13817",
    "officialStopIds": [
      "13817"
    ],
    "position": {
      "x": 585,
      "y": 530
    },
    "labelPlacement": "right"
  },
  {
    "id": "osgoode",
    "name": "Osgoode",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13820",
    "officialStopIds": [
      "13820"
    ],
    "position": {
      "x": 579,
      "y": 519
    },
    "labelPlacement": "right"
  },
  {
    "id": "st-patrick",
    "name": "St Patrick",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13821",
    "officialStopIds": [
      "13821"
    ],
    "position": {
      "x": 574,
      "y": 508
    },
    "labelPlacement": "right"
  },
  {
    "id": "queen-s-park",
    "name": "Queen's Park",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13824",
    "officialStopIds": [
      "13824"
    ],
    "position": {
      "x": 566,
      "y": 490
    },
    "labelPlacement": "right"
  },
  {
    "id": "museum",
    "name": "Museum",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13825",
    "officialStopIds": [
      "13825"
    ],
    "position": {
      "x": 557,
      "y": 468
    },
    "labelPlacement": "right"
  },
  {
    "id": "st-george",
    "name": "St George",
    "lineIds": [
      "line-1",
      "line-2"
    ],
    "officialStopId": "13858",
    "officialStopIds": [
      "13858",
      "13856"
    ],
    "position": {
      "x": 538,
      "y": 465
    },
    "labelPlacement": "top-right",
    "interchange": {
      "lineIds": [
        "line-1",
        "line-2"
      ]
    }
  },
  {
    "id": "spadina",
    "name": "Spadina",
    "lineIds": [
      "line-1",
      "line-2"
    ],
    "officialStopId": "13853",
    "officialStopIds": [
      "13853",
      "13852"
    ],
    "position": {
      "x": 518,
      "y": 464
    },
    "labelPlacement": "top",
    "interchange": {
      "lineIds": [
        "line-1",
        "line-2"
      ]
    }
  },
  {
    "id": "dupont",
    "name": "Dupont",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13828",
    "officialStopIds": [
      "13828"
    ],
    "position": {
      "x": 510,
      "y": 443
    },
    "labelPlacement": "right"
  },
  {
    "id": "st-clair-west",
    "name": "St Clair West",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13829",
    "officialStopIds": [
      "13829"
    ],
    "position": {
      "x": 480,
      "y": 410
    },
    "labelPlacement": "right"
  },
  {
    "id": "cedarvale",
    "name": "Cedarvale",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13832",
    "officialStopIds": [
      "13832"
    ],
    "position": {
      "x": 409,
      "y": 360
    },
    "labelPlacement": "right"
  },
  {
    "id": "glencairn",
    "name": "Glencairn",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13833",
    "officialStopIds": [
      "13833"
    ],
    "position": {
      "x": 394,
      "y": 332
    },
    "labelPlacement": "right"
  },
  {
    "id": "lawrence-west",
    "name": "Lawrence West",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13836",
    "officialStopIds": [
      "13836"
    ],
    "position": {
      "x": 383,
      "y": 310
    },
    "labelPlacement": "right"
  },
  {
    "id": "yorkdale",
    "name": "Yorkdale",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13837",
    "officialStopIds": [
      "13837"
    ],
    "position": {
      "x": 371,
      "y": 279
    },
    "labelPlacement": "right"
  },
  {
    "id": "wilson",
    "name": "Wilson",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "13840",
    "officialStopIds": [
      "13840"
    ],
    "position": {
      "x": 362,
      "y": 247
    },
    "labelPlacement": "right"
  },
  {
    "id": "sheppard-west",
    "name": "Sheppard West",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "14945",
    "officialStopIds": [
      "14945"
    ],
    "position": {
      "x": 319,
      "y": 198
    },
    "labelPlacement": "right"
  },
  {
    "id": "downsview-park",
    "name": "Downsview Park",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15664",
    "officialStopIds": [
      "15664"
    ],
    "position": {
      "x": 265,
      "y": 188
    },
    "labelPlacement": "right"
  },
  {
    "id": "finch-west",
    "name": "Finch West",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15659",
    "officialStopIds": [
      "15659"
    ],
    "position": {
      "x": 222,
      "y": 150
    },
    "labelPlacement": "right"
  },
  {
    "id": "york-university",
    "name": "York University",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15666",
    "officialStopIds": [
      "15666"
    ],
    "position": {
      "x": 192,
      "y": 120
    },
    "labelPlacement": "right"
  },
  {
    "id": "pioneer-village",
    "name": "Pioneer Village",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15656",
    "officialStopIds": [
      "15656"
    ],
    "position": {
      "x": 160,
      "y": 111
    },
    "labelPlacement": "right"
  },
  {
    "id": "highway-407",
    "name": "Highway 407",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15661",
    "officialStopIds": [
      "15661"
    ],
    "position": {
      "x": 112,
      "y": 90
    },
    "labelPlacement": "right"
  },
  {
    "id": "vaughan-metropolitan-centre-station",
    "name": "Vaughan Metropolitan Centre Station -",
    "lineIds": [
      "line-1"
    ],
    "officialStopId": "15662",
    "officialStopIds": [
      "15662"
    ],
    "position": {
      "x": 97,
      "y": 55
    },
    "labelPlacement": "right"
  },
  {
    "id": "kipling",
    "name": "Kipling",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13785",
    "officialStopIds": [
      "13785"
    ],
    "position": {
      "x": 70,
      "y": 565
    },
    "labelPlacement": "right"
  },
  {
    "id": "islington",
    "name": "Islington",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13784",
    "officialStopIds": [
      "13784"
    ],
    "position": {
      "x": 112,
      "y": 539
    },
    "labelPlacement": "right"
  },
  {
    "id": "royal-york",
    "name": "Royal York",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13781",
    "officialStopIds": [
      "13781"
    ],
    "position": {
      "x": 162,
      "y": 529
    },
    "labelPlacement": "right"
  },
  {
    "id": "old-mill",
    "name": "Old Mill",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13780",
    "officialStopIds": [
      "13780"
    ],
    "position": {
      "x": 215,
      "y": 527
    },
    "labelPlacement": "right"
  },
  {
    "id": "jane",
    "name": "Jane",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13777",
    "officialStopIds": [
      "13777"
    ],
    "position": {
      "x": 251,
      "y": 524
    },
    "labelPlacement": "right"
  },
  {
    "id": "runnymede",
    "name": "Runnymede",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13776",
    "officialStopIds": [
      "13776"
    ],
    "position": {
      "x": 278,
      "y": 518
    },
    "labelPlacement": "right"
  },
  {
    "id": "high-park",
    "name": "High Park",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13773",
    "officialStopIds": [
      "13773"
    ],
    "position": {
      "x": 305,
      "y": 512
    },
    "labelPlacement": "right"
  },
  {
    "id": "keele",
    "name": "Keele",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13772",
    "officialStopIds": [
      "13772"
    ],
    "position": {
      "x": 333,
      "y": 506
    },
    "labelPlacement": "right"
  },
  {
    "id": "dundas-west",
    "name": "Dundas West",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13769",
    "officialStopIds": [
      "13769"
    ],
    "position": {
      "x": 359,
      "y": 500
    },
    "labelPlacement": "right"
  },
  {
    "id": "lansdowne",
    "name": "Lansdowne",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13768",
    "officialStopIds": [
      "13768"
    ],
    "position": {
      "x": 389,
      "y": 495
    },
    "labelPlacement": "right"
  },
  {
    "id": "dufferin",
    "name": "Dufferin",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13765",
    "officialStopIds": [
      "13765"
    ],
    "position": {
      "x": 418,
      "y": 489
    },
    "labelPlacement": "right"
  },
  {
    "id": "ossington",
    "name": "Ossington",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13764",
    "officialStopIds": [
      "13764"
    ],
    "position": {
      "x": 445,
      "y": 484
    },
    "labelPlacement": "right"
  },
  {
    "id": "christie",
    "name": "Christie",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13761",
    "officialStopIds": [
      "13761"
    ],
    "position": {
      "x": 475,
      "y": 478
    },
    "labelPlacement": "right"
  },
  {
    "id": "bathurst",
    "name": "Bathurst",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13760",
    "officialStopIds": [
      "13760"
    ],
    "position": {
      "x": 498,
      "y": 473
    },
    "labelPlacement": "right"
  },
  {
    "id": "bay",
    "name": "Bay",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13757",
    "officialStopIds": [
      "13757"
    ],
    "position": {
      "x": 568,
      "y": 459
    },
    "labelPlacement": "top"
  },
  {
    "id": "yonge",
    "name": "Bloor-Yonge",
    "lineIds": [
      "line-1",
      "line-2"
    ],
    "officialStopId": "13756",
    "officialStopIds": [
      "13756"
    ],
    "position": {
      "x": 582,
      "y": 456
    },
    "labelPlacement": "right",
    "interchange": {
      "lineIds": [
        "line-1",
        "line-2"
      ]
    }
  },
  {
    "id": "sherbourne",
    "name": "Sherbourne",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13753",
    "officialStopIds": [
      "13753"
    ],
    "position": {
      "x": 616,
      "y": 453
    },
    "labelPlacement": "right"
  },
  {
    "id": "castle-frank",
    "name": "Castle Frank",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13752",
    "officialStopIds": [
      "13752"
    ],
    "position": {
      "x": 643,
      "y": 446
    },
    "labelPlacement": "right"
  },
  {
    "id": "broadview",
    "name": "Broadview",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13749",
    "officialStopIds": [
      "13749"
    ],
    "position": {
      "x": 677,
      "y": 436
    },
    "labelPlacement": "right"
  },
  {
    "id": "chester",
    "name": "Chester",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13748",
    "officialStopIds": [
      "13748"
    ],
    "position": {
      "x": 696,
      "y": 433
    },
    "labelPlacement": "right"
  },
  {
    "id": "pape",
    "name": "Pape",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13746",
    "officialStopIds": [
      "13746"
    ],
    "position": {
      "x": 725,
      "y": 427
    },
    "labelPlacement": "right"
  },
  {
    "id": "donlands",
    "name": "Donlands",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13743",
    "officialStopIds": [
      "13743"
    ],
    "position": {
      "x": 748,
      "y": 423
    },
    "labelPlacement": "right"
  },
  {
    "id": "greenwood",
    "name": "Greenwood",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13742",
    "officialStopIds": [
      "13742"
    ],
    "position": {
      "x": 768,
      "y": 419
    },
    "labelPlacement": "right"
  },
  {
    "id": "coxwell",
    "name": "Coxwell",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13739",
    "officialStopIds": [
      "13739"
    ],
    "position": {
      "x": 801,
      "y": 412
    },
    "labelPlacement": "right"
  },
  {
    "id": "woodbine",
    "name": "Woodbine",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13738",
    "officialStopIds": [
      "13738"
    ],
    "position": {
      "x": 834,
      "y": 405
    },
    "labelPlacement": "right"
  },
  {
    "id": "main-street",
    "name": "Main Street",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13735",
    "officialStopIds": [
      "13735"
    ],
    "position": {
      "x": 874,
      "y": 397
    },
    "labelPlacement": "right"
  },
  {
    "id": "victoria-park",
    "name": "Victoria Park",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13734",
    "officialStopIds": [
      "13734"
    ],
    "position": {
      "x": 917,
      "y": 377
    },
    "labelPlacement": "right"
  },
  {
    "id": "warden",
    "name": "Warden",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "13732",
    "officialStopIds": [
      "13732"
    ],
    "position": {
      "x": 948,
      "y": 322
    },
    "labelPlacement": "right"
  },
  {
    "id": "kennedy-station",
    "name": "Kennedy Station -",
    "lineIds": [
      "line-2"
    ],
    "officialStopId": "14947",
    "officialStopIds": [
      "14947"
    ],
    "position": {
      "x": 1000,
      "y": 256
    },
    "labelPlacement": "right"
  },
  {
    "id": "bayview",
    "name": "Bayview",
    "lineIds": [
      "line-4"
    ],
    "officialStopId": "13844",
    "officialStopIds": [
      "13844"
    ],
    "position": {
      "x": 579,
      "y": 144
    },
    "labelPlacement": "right"
  },
  {
    "id": "bessarion",
    "name": "Bessarion",
    "lineIds": [
      "line-4"
    ],
    "officialStopId": "13845",
    "officialStopIds": [
      "13845"
    ],
    "position": {
      "x": 615,
      "y": 136
    },
    "labelPlacement": "right"
  },
  {
    "id": "leslie",
    "name": "Leslie",
    "lineIds": [
      "line-4"
    ],
    "officialStopId": "13848",
    "officialStopIds": [
      "13848"
    ],
    "position": {
      "x": 654,
      "y": 129
    },
    "labelPlacement": "top"
  },
  {
    "id": "don-mills-station",
    "name": "Don Mills",
    "lineIds": [
      "line-4"
    ],
    "officialStopId": "14949",
    "officialStopIds": [
      "14949"
    ],
    "position": {
      "x": 717,
      "y": 115
    },
    "labelPlacement": "right"
  }
]

export const connections = [
  {
    "id": "line-1-0",
    "lineId": "line-1",
    "source": "finch",
    "target": "north-york-centre"
  },
  {
    "id": "line-1-1",
    "lineId": "line-1",
    "source": "north-york-centre",
    "target": "sheppard-yonge"
  },
  {
    "id": "line-1-2",
    "lineId": "line-1",
    "source": "sheppard-yonge",
    "target": "york-mills"
  },
  {
    "id": "line-1-3",
    "lineId": "line-1",
    "source": "york-mills",
    "target": "lawrence"
  },
  {
    "id": "line-1-4",
    "lineId": "line-1",
    "source": "lawrence",
    "target": "eglinton"
  },
  {
    "id": "line-1-5",
    "lineId": "line-1",
    "source": "eglinton",
    "target": "davisville"
  },
  {
    "id": "line-1-6",
    "lineId": "line-1",
    "source": "davisville",
    "target": "st-clair"
  },
  {
    "id": "line-1-7",
    "lineId": "line-1",
    "source": "st-clair",
    "target": "summerhill"
  },
  {
    "id": "line-1-8",
    "lineId": "line-1",
    "source": "summerhill",
    "target": "rosedale"
  },
  {
    "id": "line-1-9",
    "lineId": "line-1",
    "source": "rosedale",
    "target": "yonge"
  },
  {
    "id": "line-1-10",
    "lineId": "line-1",
    "source": "yonge",
    "target": "wellesley"
  },
  {
    "id": "line-1-11",
    "lineId": "line-1",
    "source": "wellesley",
    "target": "college"
  },
  {
    "id": "line-1-12",
    "lineId": "line-1",
    "source": "college",
    "target": "tmu"
  },
  {
    "id": "line-1-13",
    "lineId": "line-1",
    "source": "tmu",
    "target": "queen"
  },
  {
    "id": "line-1-14",
    "lineId": "line-1",
    "source": "queen",
    "target": "king"
  },
  {
    "id": "line-1-15",
    "lineId": "line-1",
    "source": "king",
    "target": "union"
  },
  {
    "id": "line-1-16",
    "lineId": "line-1",
    "source": "union",
    "target": "st-andrew"
  },
  {
    "id": "line-1-17",
    "lineId": "line-1",
    "source": "st-andrew",
    "target": "osgoode"
  },
  {
    "id": "line-1-18",
    "lineId": "line-1",
    "source": "osgoode",
    "target": "st-patrick"
  },
  {
    "id": "line-1-19",
    "lineId": "line-1",
    "source": "st-patrick",
    "target": "queen-s-park"
  },
  {
    "id": "line-1-20",
    "lineId": "line-1",
    "source": "queen-s-park",
    "target": "museum"
  },
  {
    "id": "line-1-21",
    "lineId": "line-1",
    "source": "museum",
    "target": "st-george"
  },
  {
    "id": "line-1-22",
    "lineId": "line-1",
    "source": "st-george",
    "target": "spadina"
  },
  {
    "id": "line-1-23",
    "lineId": "line-1",
    "source": "spadina",
    "target": "dupont"
  },
  {
    "id": "line-1-24",
    "lineId": "line-1",
    "source": "dupont",
    "target": "st-clair-west"
  },
  {
    "id": "line-1-25",
    "lineId": "line-1",
    "source": "st-clair-west",
    "target": "cedarvale"
  },
  {
    "id": "line-1-26",
    "lineId": "line-1",
    "source": "cedarvale",
    "target": "glencairn"
  },
  {
    "id": "line-1-27",
    "lineId": "line-1",
    "source": "glencairn",
    "target": "lawrence-west"
  },
  {
    "id": "line-1-28",
    "lineId": "line-1",
    "source": "lawrence-west",
    "target": "yorkdale"
  },
  {
    "id": "line-1-29",
    "lineId": "line-1",
    "source": "yorkdale",
    "target": "wilson"
  },
  {
    "id": "line-1-30",
    "lineId": "line-1",
    "source": "wilson",
    "target": "sheppard-west"
  },
  {
    "id": "line-1-31",
    "lineId": "line-1",
    "source": "sheppard-west",
    "target": "downsview-park"
  },
  {
    "id": "line-1-32",
    "lineId": "line-1",
    "source": "downsview-park",
    "target": "finch-west"
  },
  {
    "id": "line-1-33",
    "lineId": "line-1",
    "source": "finch-west",
    "target": "york-university"
  },
  {
    "id": "line-1-34",
    "lineId": "line-1",
    "source": "york-university",
    "target": "pioneer-village"
  },
  {
    "id": "line-1-35",
    "lineId": "line-1",
    "source": "pioneer-village",
    "target": "highway-407"
  },
  {
    "id": "line-1-36",
    "lineId": "line-1",
    "source": "highway-407",
    "target": "vaughan-metropolitan-centre-station"
  },
  {
    "id": "line-2-0",
    "lineId": "line-2",
    "source": "kipling",
    "target": "islington"
  },
  {
    "id": "line-2-1",
    "lineId": "line-2",
    "source": "islington",
    "target": "royal-york"
  },
  {
    "id": "line-2-2",
    "lineId": "line-2",
    "source": "royal-york",
    "target": "old-mill"
  },
  {
    "id": "line-2-3",
    "lineId": "line-2",
    "source": "old-mill",
    "target": "jane"
  },
  {
    "id": "line-2-4",
    "lineId": "line-2",
    "source": "jane",
    "target": "runnymede"
  },
  {
    "id": "line-2-5",
    "lineId": "line-2",
    "source": "runnymede",
    "target": "high-park"
  },
  {
    "id": "line-2-6",
    "lineId": "line-2",
    "source": "high-park",
    "target": "keele"
  },
  {
    "id": "line-2-7",
    "lineId": "line-2",
    "source": "keele",
    "target": "dundas-west"
  },
  {
    "id": "line-2-8",
    "lineId": "line-2",
    "source": "dundas-west",
    "target": "lansdowne"
  },
  {
    "id": "line-2-9",
    "lineId": "line-2",
    "source": "lansdowne",
    "target": "dufferin"
  },
  {
    "id": "line-2-10",
    "lineId": "line-2",
    "source": "dufferin",
    "target": "ossington"
  },
  {
    "id": "line-2-11",
    "lineId": "line-2",
    "source": "ossington",
    "target": "christie"
  },
  {
    "id": "line-2-12",
    "lineId": "line-2",
    "source": "christie",
    "target": "bathurst"
  },
  {
    "id": "line-2-13",
    "lineId": "line-2",
    "source": "bathurst",
    "target": "spadina"
  },
  {
    "id": "line-2-14",
    "lineId": "line-2",
    "source": "spadina",
    "target": "st-george"
  },
  {
    "id": "line-2-15",
    "lineId": "line-2",
    "source": "st-george",
    "target": "bay"
  },
  {
    "id": "line-2-16",
    "lineId": "line-2",
    "source": "bay",
    "target": "yonge"
  },
  {
    "id": "line-2-17",
    "lineId": "line-2",
    "source": "yonge",
    "target": "sherbourne"
  },
  {
    "id": "line-2-18",
    "lineId": "line-2",
    "source": "sherbourne",
    "target": "castle-frank"
  },
  {
    "id": "line-2-19",
    "lineId": "line-2",
    "source": "castle-frank",
    "target": "broadview"
  },
  {
    "id": "line-2-20",
    "lineId": "line-2",
    "source": "broadview",
    "target": "chester"
  },
  {
    "id": "line-2-21",
    "lineId": "line-2",
    "source": "chester",
    "target": "pape"
  },
  {
    "id": "line-2-22",
    "lineId": "line-2",
    "source": "pape",
    "target": "donlands"
  },
  {
    "id": "line-2-23",
    "lineId": "line-2",
    "source": "donlands",
    "target": "greenwood"
  },
  {
    "id": "line-2-24",
    "lineId": "line-2",
    "source": "greenwood",
    "target": "coxwell"
  },
  {
    "id": "line-2-25",
    "lineId": "line-2",
    "source": "coxwell",
    "target": "woodbine"
  },
  {
    "id": "line-2-26",
    "lineId": "line-2",
    "source": "woodbine",
    "target": "main-street"
  },
  {
    "id": "line-2-27",
    "lineId": "line-2",
    "source": "main-street",
    "target": "victoria-park"
  },
  {
    "id": "line-2-28",
    "lineId": "line-2",
    "source": "victoria-park",
    "target": "warden"
  },
  {
    "id": "line-2-29",
    "lineId": "line-2",
    "source": "warden",
    "target": "kennedy-station"
  },
  {
    "id": "line-4-0",
    "lineId": "line-4",
    "source": "sheppard-yonge",
    "target": "bayview"
  },
  {
    "id": "line-4-1",
    "lineId": "line-4",
    "source": "bayview",
    "target": "bessarion"
  },
  {
    "id": "line-4-2",
    "lineId": "line-4",
    "source": "bessarion",
    "target": "leslie"
  },
  {
    "id": "line-4-3",
    "lineId": "line-4",
    "source": "leslie",
    "target": "don-mills-station"
  }
]

export const sampleNetwork = Object.freeze({
  metadata: networkMetadata,
  lines,
  stations,
  connections,
})
