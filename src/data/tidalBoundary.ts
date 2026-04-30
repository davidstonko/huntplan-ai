/**
 * Maryland Tidal / Non-Tidal Boundary Segments
 *
 * Source: MD DNR ArcGIS FeatureServer — Tidal_NonTidal_view
 * https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/Tidal_NonTidal_view/FeatureServer
 *
 * These boundary segments mark the regulatory transition between Maryland
 * tidal waters (saltwater licensing + creel rules) and non-tidal waters
 * (freshwater licensing + trout / bass rules). 100 segments clipped from
 * the DNR FeatureServer layer during the Wave 5C ingest (2026-04-18).
 *
 * Segments typically represent the upstream limit of tidal influence —
 * commonly a dam, weir, or DNR-designated landmark — with a short pair of
 * coordinates defining the demarcation line across the waterbody.
 *
 * Anglers must see this overlay whenever the FishMap is open so they know
 * which regulation structure applies at a given pin. FishMapScreen enables
 * the layer by default.
 *
 * Last updated: 2026-04-18 (data) / 2026-04-19 (source attribution audit)
 */

export interface TidalBoundarySegment {
  id: string;
  waterBody?: string;
  description?: string;
  coordinates: [number, number][]; // [lng, lat] pairs
}

export const TIDAL_BOUNDARY: TidalBoundarySegment[] = [
  {
    "id": "1",
    "description": "Winter's Run: dam located 1/2 mile south of Maryland Route 7,  the Old Philadelphia Road.",
    "coordinates": [
      [
        -76.308142633738,
        39.4398841308845
      ],
      [
        -76.3076720670921,
        39.4388953161349
      ]
    ]
  },
  {
    "id": "2",
    "description": "Bynum Run: Old Philadelphia Road Bridge on Maryland Route 7.",
    "coordinates": [
      [
        -76.2665961437834,
        39.4718554666092
      ],
      [
        -76.266495319609,
        39.4719412290375
      ]
    ]
  },
  {
    "id": "3",
    "description": "James Run: Old Philadelphia Road Bridge on Maryland Route 7.",
    "coordinates": [
      [
        -76.2605164438413,
        39.4764395388406
      ],
      [
        -76.2604220607925,
        39.4764961425315
      ]
    ]
  },
  {
    "id": "4",
    "description": "Deer Creek: Railroad bridge located at the mouth of Deer Creek.",
    "coordinates": [
      [
        -76.1489788664399,
        39.6135839391432
      ],
      [
        -76.1487680899291,
        39.6131772955616
      ]
    ]
  },
  {
    "id": "5",
    "description": "Gray's Run: CSX Railroad crossing upstream of U.S. 40.",
    "coordinates": [
      [
        -76.2176088448307,
        39.4797077014531
      ],
      [
        -76.2174216720452,
        39.4798040142394
      ]
    ]
  },
  {
    "id": "6",
    "description": "Big Gunpowder Falls: 3/4 of a mile south of Maryland Route 7,  the Old Philadelphia Road at B&O Railroad Bridge.",
    "coordinates": [
      [
        -76.3747816813303,
        39.4223765529571
      ],
      [
        -76.3745125015896,
        39.4225860359565
      ]
    ]
  },
  {
    "id": "7",
    "description": "Little Gunpowder Falls: 3/4 of a mile south of Maryland Route 7,  the Old Philadelphia Road at B&O Railroad Bridge.",
    "coordinates": [
      [
        -76.3938371760636,
        39.4115267441866
      ],
      [
        -76.3935424532015,
        39.4118168833297
      ]
    ]
  },
  {
    "id": "8",
    "description": "Stemmers Run: Golden Ring Road Bridge.",
    "coordinates": [
      [
        -76.4741424832397,
        39.3294895272739
      ],
      [
        -76.4739095571067,
        39.3294306956895
      ]
    ]
  },
  {
    "id": "9",
    "description": "Stansbury Park Pond: base of dam.",
    "coordinates": [
      [
        -76.4989798882432,
        39.2612816410157
      ],
      [
        -76.4982385974527,
        39.2614107490349
      ]
    ]
  },
  {
    "id": "10",
    "description": "Patapsco River: B&O Viaduct at Relay.",
    "coordinates": [
      [
        -76.7132972258066,
        39.2215154020609
      ],
      [
        -76.7132203153396,
        39.2217440112493
      ]
    ]
  },
  {
    "id": "11",
    "description": "Patuxent River Mainstem: bridge on Maryland Route 214;",
    "coordinates": [
      [
        -76.6729805362192,
        38.9072266249873
      ],
      [
        -76.6725955323678,
        38.9073661719662
      ]
    ]
  },
  {
    "id": "12",
    "description": "Patuxent River: Lyons Creek: Maryland Route 4;",
    "coordinates": [
      [
        -76.6575509198443,
        38.7647322369137
      ],
      [
        -76.6575215039721,
        38.7645176324397
      ]
    ]
  },
  {
    "id": "13",
    "description": "Patuxent River: Stocketts Run: confluence with the river;",
    "coordinates": [
      [
        -76.6754395610124,
        38.8824127639426
      ],
      [
        -76.675230402852,
        38.8823047131002
      ]
    ]
  },
  {
    "id": "14",
    "description": "Patuxent River: Rock Run: confluence with the river;",
    "coordinates": [
      [
        -76.6914344880518,
        38.8543564131111
      ],
      [
        -76.6912918802152,
        38.8546562606463
      ]
    ]
  },
  {
    "id": "15",
    "description": "Patuxent River: Ferry Branch: confluence with the river.",
    "coordinates": [
      [
        -76.6993199915465,
        38.83836272503
      ],
      [
        -76.6993271219384,
        38.8380424440879
      ]
    ]
  },
  {
    "id": "16",
    "description": "Severn River: bridge on Maryland Route 3.",
    "coordinates": [
      [
        -76.6267807754988,
        39.0808969519131
      ],
      [
        -76.6266452980541,
        39.081157097091
      ]
    ]
  },
  {
    "id": "17",
    "description": "Furnace Branch: Maryland Route 2.",
    "coordinates": [
      [
        -76.6131166242001,
        39.1829236459788
      ],
      [
        -76.6130731810053,
        39.1830283695414
      ]
    ]
  },
  {
    "id": "18",
    "description": "Anacostia River: Northeast Branch Bridge at northbound lane of Alternate U.S. Route 1,  Bladensburg Road;",
    "coordinates": [
      [
        -76.9410723186098,
        38.9447963009262
      ],
      [
        -76.9410960865825,
        38.9454432935181
      ]
    ]
  },
  {
    "id": "19",
    "description": "Anacostia River: Northwest Branch Bridge at southbound lane of Rhode Island Avenue.",
    "coordinates": [
      [
        -76.9472519915279,
        38.9452214681517
      ],
      [
        -76.9467528640999,
        38.94559117671
      ]
    ]
  },
  {
    "id": "20",
    "description": "Marley Creek: Maryland Route 10.",
    "coordinates": [
      [
        -76.5997913070942,
        39.1521712722188
      ],
      [
        -76.5993159476389,
        39.1516920543685
      ]
    ]
  },
  {
    "id": "21",
    "description": "Magothy River: Catherine Avenue.",
    "coordinates": [
      [
        -76.5497847659234,
        39.115032389525
      ],
      [
        -76.5498239830786,
        39.1148498222361
      ]
    ]
  },
  {
    "id": "22",
    "description": "South River and its tributaries: North River: Rutland Road;",
    "coordinates": [
      [
        -76.6224688258195,
        38.9862980421647
      ],
      [
        -76.6223438197291,
        38.9863748623043
      ]
    ]
  },
  {
    "id": "23",
    "description": "South River and its tributaries: Bacon Ridge Branch: Chesterfield Road;",
    "coordinates": [
      [
        -76.614366476387,
        39.0016027952323
      ],
      [
        -76.6141617115332,
        39.0017689141353
      ]
    ]
  },
  {
    "id": "24",
    "description": "South River and its tributaries: Beards Creek: Maryland Route 214;",
    "coordinates": [
      [
        -76.5900837375515,
        38.9277042331364
      ],
      [
        -76.5898413042293,
        38.9276570835112
      ]
    ]
  },
  {
    "id": "25",
    "description": "South River and its tributaries: Broad Creek: Harry S Truman Parkway.",
    "coordinates": [
      [
        -76.5688746819717,
        38.9831651761574
      ],
      [
        -76.5686097691185,
        38.9831010101621
      ]
    ]
  },
  {
    "id": "26",
    "description": "Potomac River: man-made dam at Little Falls.",
    "coordinates": [
      [
        -77.1320574083594,
        38.9476842430774
      ],
      [
        -77.1273905409369,
        38.9493769022622
      ]
    ]
  },
  {
    "id": "27",
    "description": "Piscataway Creek: bridge on Maryland Route 224 (Livingston Road).",
    "coordinates": [
      [
        -76.9745249231324,
        38.7034513235373
      ],
      [
        -76.9745498795038,
        38.7032064848525
      ]
    ]
  },
  {
    "id": "28",
    "description": "Henson Run: bridge on Old Broad Creek Road.",
    "coordinates": [
      [
        -77.001918211776,
        38.7594698779145
      ],
      [
        -77.0015300761098,
        38.7593238931079
      ]
    ]
  },
  {
    "id": "29",
    "description": "Western Branch: bridge on Maryland Route 4.",
    "coordinates": [
      [
        -76.7529704883674,
        38.8112784491387
      ],
      [
        -76.7527236330724,
        38.8113065283528
      ]
    ]
  },
  {
    "id": "30",
    "description": "Nanjemoy Creek: Mainstem: Maryland Route 6;",
    "coordinates": [
      [
        -77.1977901158205,
        38.4207644722845
      ],
      [
        -77.1975334217147,
        38.4204907364047
      ]
    ]
  },
  {
    "id": "31",
    "description": "Nanjemoy Creek: Mill Run (Burgess Cr.): Maryland Route 6;",
    "coordinates": [
      [
        -77.0843114108256,
        38.4825299648633
      ],
      [
        -77.0840805594628,
        38.4827174817904
      ]
    ]
  },
  {
    "id": "32",
    "description": "Nanjemoy Creek: Hill Top Fork: Maryland Route 6;",
    "coordinates": [
      [
        -77.1107805237036,
        38.4845083339253
      ],
      [
        -77.1107438025032,
        38.4842938464916
      ]
    ]
  },
  {
    "id": "33",
    "description": "Nanjemoy Creek: Wards Run: Maryland Route 6.",
    "coordinates": [
      [
        -77.1322186807793,
        38.4835906982705
      ],
      [
        -77.131831640335,
        38.4836816428742
      ]
    ]
  },
  {
    "id": "34",
    "description": "Wicomico River: Allens Fresh,  bridge on Maryland Route 234.",
    "coordinates": [
      [
        -76.9388464638337,
        38.4151309283939
      ],
      [
        -76.9381372659274,
        38.4154523371196
      ]
    ]
  },
  {
    "id": "35",
    "description": "Port Tobacco Creek: bridge on Maryland Route 6.",
    "coordinates": [
      [
        -77.0219342302926,
        38.5143832352749
      ],
      [
        -77.0216261973654,
        38.5144010886753
      ]
    ]
  },
  {
    "id": "36",
    "description": "Mattawoman Creek: bridge on Maryland Route 225.",
    "coordinates": [
      [
        -77.1187679246328,
        38.5888343440076
      ],
      [
        -77.1187382790013,
        38.5885053342813
      ]
    ]
  },
  {
    "id": "37",
    "description": "Patuxent River: Swanson Creek: Maryland Route 381;",
    "coordinates": [
      [
        -76.7393142141175,
        38.5582763601372
      ],
      [
        -76.7393661403289,
        38.558188284114
      ]
    ]
  },
  {
    "id": "38",
    "description": "Patuxent River: Spice Creek: Maryland Route 382,  Croom Road;",
    "coordinates": [
      [
        -76.7259766558749,
        38.6911360054176
      ],
      [
        -76.7258847861615,
        38.6909832420288
      ]
    ]
  },
  {
    "id": "39",
    "description": "Patuxent River: Full Mill Branch: Maryland Route 382,  Croom Road;",
    "coordinates": [
      [
        -76.7143111210197,
        38.6639970422561
      ],
      [
        -76.7143020016163,
        38.6638444721354
      ]
    ]
  },
  {
    "id": "40",
    "description": "Patuxent River: Black Swamp Creek: Maryland Route 382,  Croom Road.",
    "coordinates": [
      [
        -76.7229373624274,
        38.6331170182008
      ],
      [
        -76.7228156723847,
        38.6331524819227
      ]
    ]
  },
  {
    "id": "41",
    "description": "Pomonkey Creek: Fenwick Road.",
    "coordinates": [
      [
        -77.0858103165955,
        38.6535301551508
      ],
      [
        -77.0857152447045,
        38.653386304967
      ]
    ]
  },
  {
    "id": "42",
    "description": "Hoghole Run: Maryland Route 6.",
    "coordinates": [
      [
        -77.0284220920772,
        38.5119231146826
      ],
      [
        -77.0281487603904,
        38.5121462894961
      ]
    ]
  },
  {
    "id": "43",
    "description": "Oxen Creek (Run): Maryland Route 210.",
    "coordinates": [
      [
        -77.0013356993207,
        38.8212435844875
      ],
      [
        -77.0011633815182,
        38.8210861833508
      ]
    ]
  },
  {
    "id": "44",
    "description": "Chester River: 500 yards upstream from the Pennsylvania Railroad Bridge at Millington at the point where the Cypress Branch empties into the Chester River.",
    "coordinates": [
      [
        -75.8345831590012,
        39.2541505890101
      ],
      [
        -75.8350086501736,
        39.2535426538918
      ]
    ]
  },
  {
    "id": "45",
    "description": "Unicorn Branch: the U.S. Geological Survey weir just east of Maryland Route 313.",
    "coordinates": [
      [
        -75.8596699798069,
        39.247658961134
      ],
      [
        -75.8591470844062,
        39.2477970086809
      ]
    ]
  },
  {
    "id": "46",
    "description": "Sassafras River: Maryland Route 299.",
    "coordinates": [
      [
        -75.8016808568896,
        39.3780656420799
      ],
      [
        -75.801787812767,
        39.377744129859
      ]
    ]
  },
  {
    "id": "47",
    "description": "Herring Branch: Maryland Route 299.",
    "coordinates": [
      [
        -75.8037409062205,
        39.3719130336658
      ],
      [
        -75.80370909428,
        39.3717841711886
      ]
    ]
  },
  {
    "id": "48",
    "description": "Patuxent River: Mataponi Creek: St. Thomas Church Road;",
    "coordinates": [
      [
        -76.7201189903811,
        38.7380727352875
      ],
      [
        -76.7200506574596,
        38.7378595322179
      ]
    ]
  },
  {
    "id": "49",
    "description": "Morgan Creek: Wallis Road.",
    "coordinates": [
      [
        -76.0149336569042,
        39.2795626685795
      ],
      [
        -76.0147167741527,
        39.2794890766141
      ]
    ]
  },
  {
    "id": "50",
    "description": "Red Lion Branch: confluence with the Chester River.",
    "coordinates": [
      [
        -75.9150630112183,
        39.2411548960987
      ],
      [
        -75.9128032927064,
        39.2416059120383
      ]
    ]
  },
  {
    "id": "51",
    "description": "Wye East River: Wye Mills Lake dam.",
    "coordinates": [
      [
        -76.0799084499705,
        38.943023285284
      ],
      [
        -76.0799813161109,
        38.9429940642118
      ],
      [
        -76.0800925226198,
        38.9429502475288
      ],
      [
        -76.0801468142438,
        38.9428821471906
      ],
      [
        -76.0801587199766,
        38.9428464873552
      ],
      [
        -76.0801632267109,
        38.9427928925322
      ],
      [
        -76.0801448061418,
        38.942742096748
      ],
      [
        -76.0801453058704,
        38.9427033676945
      ],
      [
        -76.080138022224,
        38.9426764952322
      ],
      [
        -76.0801232627402,
        38.942637646096
      ],
      [
        -76.0801160944343,
        38.9426018361581
      ],
      [
        -76.0801164019685,
        38.9425780028937
      ],
      [
        -76.080124492867,
        38.9425423130387
      ],
      [
        -76.0801401749102,
        38.9425096623817
      ],
      [
        -76.0801751231118,
        38.9424622660287
      ],
      [
        -76.0801907666756,
        38.9424325945226
      ],
      [
        -76.0802219000154,
        38.9423851681363
      ],
      [
        -76.0802607781962,
        38.9423288642993
      ],
      [
        -76.0802919883126,
        38.942275479577
      ],
      [
        -76.0803231215165,
        38.9422280531622
      ],
      [
        -76.080354331542,
        38.942174668422
      ],
      [
        -76.0803853877997,
        38.9421332003067
      ],
      [
        -76.0804125908174,
        38.9420946813299
      ],
      [
        -76.0804283110587,
        38.942059051473
      ],
      [
        -76.0804326638275,
        38.9420173732653
      ],
      [
        -76.0804331633945,
        38.9419786442049
      ],
      [
        -76.0804299634792,
        38.9419309476581
      ],
      [
        -76.0804266867115,
        38.941889209428
      ],
      [
        -76.0803892692423,
        38.9418323053006
      ],
      [
        -76.0803630270891,
        38.9417963453102
      ],
      [
        -76.0803216028,
        38.94175430694
      ],
      [
        -76.0802989448623,
        38.9417362519007
      ],
      [
        -76.0802535521501,
        38.9417061001253
      ],
      [
        -76.0802307789355,
        38.9416969825483
      ]
    ]
  },
  {
    "id": "52",
    "description": "Choptank River: bypass bridge on Maryland Route 313 on the outskirts of Greensboro.",
    "coordinates": [
      [
        -75.8017083992057,
        38.9772393172932
      ],
      [
        -75.8016061985911,
        38.9767304018782
      ]
    ]
  },
  {
    "id": "53",
    "description": "Tuckahoe Creek: abandoned stone railroad bridge upstream of Maryland Route 404.",
    "coordinates": [
      [
        -75.950000452729,
        38.9240379085339
      ],
      [
        -75.9492161096277,
        38.9244040293599
      ]
    ]
  },
  {
    "id": "54",
    "description": "Watt's Creek: bridge on American Legion Road.",
    "coordinates": [
      [
        -75.8084620324859,
        38.8632329429997
      ],
      [
        -75.8080769913271,
        38.8629109233264
      ]
    ]
  },
  {
    "id": "55",
    "description": "Fowling Creek: wooden bridge on Stratum Road about 1 mile below Maryland Route 16.",
    "coordinates": [
      [
        -75.8731865845104,
        38.7778631986784
      ],
      [
        -75.87228815514,
        38.7779410205881
      ]
    ]
  },
  {
    "id": "56",
    "description": "Chapel Branch: Maryland Route 313 near Piney Grove Church.",
    "coordinates": [
      [
        -75.8180120150569,
        38.9123367521536
      ],
      [
        -75.817987517612,
        38.9119040583637
      ]
    ]
  },
  {
    "id": "57",
    "description": "Marshy Hope Creek: confluence with Faulkner Branch.",
    "coordinates": [
      [
        -75.7731884580916,
        38.7101564142028
      ],
      [
        -75.7728800956025,
        38.7100423223013
      ]
    ]
  },
  {
    "id": "58",
    "description": "Mill Creek: Maryland Route 16.",
    "coordinates": [
      [
        -75.8463420316297,
        38.8292892744563
      ],
      [
        -75.8465131610336,
        38.8290152420448
      ]
    ]
  },
  {
    "id": "59",
    "description": "Hunting Creek: Maryland Route 331.",
    "coordinates": [
      [
        -75.8966031797494,
        38.7011116832036
      ],
      [
        -75.8964644246975,
        38.700956858113
      ]
    ]
  },
  {
    "id": "60",
    "description": "Pocomoke River: bridge on Whiton Crossing,  3 miles south of Powellville.",
    "coordinates": [
      [
        -75.3682856757436,
        38.2868716493548
      ],
      [
        -75.3677913019101,
        38.2869014988178
      ]
    ]
  },
  {
    "id": "61",
    "description": "Wicomico River: Isabella Street in Salisbury.",
    "coordinates": [
      [
        -75.6031023406954,
        38.3717976699863
      ],
      [
        -75.6026243433096,
        38.3718526990584
      ]
    ]
  },
  {
    "id": "62",
    "description": "Beaverdam Creek: dam just upstream of U.S. Route 13 (Business).",
    "coordinates": [
      [
        -75.5725779957149,
        38.3528007129481
      ],
      [
        -75.5723427682383,
        38.3530600432461
      ]
    ]
  },
  {
    "id": "63",
    "description": "Nassawango Creek: Furnace Road.",
    "coordinates": [
      [
        -75.4681134369391,
        38.2061847914341
      ],
      [
        -75.4677848542549,
        38.2062924842217
      ]
    ]
  },
  {
    "id": "64",
    "description": "Park Hall Run: Maryland Route 5.",
    "coordinates": [
      [
        -76.4630230503222,
        38.2257752393603
      ],
      [
        -76.4626712843253,
        38.2257266931552
      ]
    ]
  },
  {
    "id": "65",
    "description": "McIntosh Run: Maryland Route 5.",
    "coordinates": [
      [
        -76.6564904634249,
        38.3042275025742
      ],
      [
        -76.6561149294552,
        38.3040521786716
      ]
    ]
  },
  {
    "id": "66",
    "description": "Great Mills Run: bridge on Maryland Route 5.",
    "coordinates": [
      [
        -76.4981098028227,
        38.2370717283686
      ],
      [
        -76.4977002062971,
        38.2370102654941
      ]
    ]
  },
  {
    "id": "67",
    "description": "Town Run: bridge on Maryland Route 5.",
    "coordinates": [
      [
        -76.629697910965,
        38.2945475193708
      ],
      [
        -76.6293877047434,
        38.2943446247584
      ]
    ]
  },
  {
    "id": "68",
    "description": "Chaptico Run: Chaptico Bridge on Maryland Route 234.",
    "coordinates": [
      [
        -76.784647398525,
        38.3703604498159
      ],
      [
        -76.784319400501,
        38.3700622981698
      ]
    ]
  },
  {
    "id": "69",
    "description": "Eastern Branch: Maryland Route 5.",
    "coordinates": [
      [
        -76.4564829552113,
        38.2234774652068
      ],
      [
        -76.4561834787545,
        38.223369166361
      ]
    ]
  },
  {
    "id": "70",
    "description": "Dynard Run: Maryland Route 242.",
    "coordinates": [
      [
        -76.7351554334468,
        38.3155048013308
      ],
      [
        -76.735032718057,
        38.31572244909
      ]
    ]
  },
  {
    "id": "71",
    "description": "Tomakokin Creek: Maryland Route 470.",
    "coordinates": [
      [
        -76.7432952384787,
        38.2922502870198
      ],
      [
        -76.7432411167496,
        38.2920103492288
      ]
    ]
  },
  {
    "id": "72",
    "description": "Buds Creek: Maryland Route 234.",
    "coordinates": [
      [
        -76.8472119661266,
        38.4073052878212
      ],
      [
        -76.8468272865613,
        38.4071697300469
      ]
    ]
  },
  {
    "id": "73",
    "description": "Gilbert Swamp Run: Maryland Route 234.",
    "coordinates": [
      [
        -76.9024831831891,
        38.4161950963224
      ],
      [
        -76.9021314171922,
        38.4160088697721
      ]
    ]
  },
  {
    "id": "74",
    "description": "St. Clements Creek: Maryland Route 234,  bridge at town of Clements.",
    "coordinates": [
      [
        -76.7231253552306,
        38.3250523892704
      ],
      [
        -76.7227469684189,
        38.324974225641
      ]
    ]
  },
  {
    "id": "75",
    "description": "St. Leonard's Creek: Parran Road.",
    "coordinates": [
      [
        -76.4951367090194,
        38.4490871243233
      ],
      [
        -76.4948277253735,
        38.449224868899
      ]
    ]
  },
  {
    "id": "76",
    "description": "Battle Creek: bridge about 2 miles east of Bowens (Sixes Road).",
    "coordinates": [
      [
        -76.5942073765269,
        38.4941184455677
      ],
      [
        -76.5938193082721,
        38.4940922976334
      ]
    ]
  },
  {
    "id": "77",
    "description": "Parker's Creek: Maryland Route 765.",
    "coordinates": [
      [
        -76.5720819558171,
        38.5212425460369
      ],
      [
        -76.5717777257658,
        38.5210454332289
      ]
    ]
  },
  {
    "id": "78",
    "description": "Hunting Creek: bridge on Maryland Route 263 about 100 yards west of Maryland Route 4.",
    "coordinates": [
      [
        -76.6053347022679,
        38.5842190461745
      ],
      [
        -76.6048269022992,
        38.5845190623888
      ]
    ]
  },
  {
    "id": "79",
    "description": "Hall's Creek: Bridge on Maryland Route 4.",
    "coordinates": [
      [
        -76.6518914789086,
        38.7095435588228
      ],
      [
        -76.6513923514807,
        38.7091818958325
      ]
    ]
  },
  {
    "id": "80",
    "description": "Fishing Creek: 1-1/2 miles upstream from the mouth of the creek at Chesapeake Beach.",
    "coordinates": [
      [
        -76.5542718668466,
        38.6815258412003
      ],
      [
        -76.553860989701,
        38.6810952252237
      ]
    ]
  },
  {
    "id": "81",
    "description": "Plum Point Creek: bridge on Maryland Route 263.",
    "coordinates": [
      [
        -76.5234105702467,
        38.6071286495723
      ],
      [
        -76.5228163709276,
        38.6069336295288
      ]
    ]
  },
  {
    "id": "82",
    "description": "Mills Creek: Maryland Route 760.",
    "coordinates": [
      [
        -76.4270170252512,
        38.3548260277699
      ],
      [
        -76.4267793455236,
        38.3544439387634
      ]
    ]
  },
  {
    "id": "83",
    "description": "Hellen Creek: Mill Branch Road,  near Solomons.",
    "coordinates": [
      [
        -76.4600713418543,
        38.3773317684333
      ],
      [
        -76.4596791703038,
        38.37688458359
      ]
    ]
  },
  {
    "id": "84",
    "description": "Island Creek: Ross Road,  near Brooms Island.",
    "coordinates": [
      [
        -76.5538166451796,
        38.448802930987
      ],
      [
        -76.5533294017379,
        38.448728474057
      ]
    ]
  },
  {
    "id": "85",
    "description": "St. Johns Creek: Maryland Route 4.",
    "coordinates": [
      [
        -76.4586758280801,
        38.4187989741154
      ],
      [
        -76.4582123526112,
        38.4183427346594
      ]
    ]
  },
  {
    "id": "86",
    "description": "Quaker Swamp: Maryland Routes 2 and 4.",
    "coordinates": [
      [
        -76.4812687684924,
        38.4465147308386
      ],
      [
        -76.4808642596031,
        38.4464557154991
      ]
    ]
  },
  {
    "id": "87",
    "description": "Susquehanna River. Conowingo Dam at U.S. Route 1.",
    "coordinates": [
      [
        -76.1753834094299,
        39.6562333728432
      ],
      [
        -76.1709349863904,
        39.6648645391035
      ]
    ]
  },
  {
    "id": "88",
    "description": "Octoraro Creek: bridge on U.S. Route 222.",
    "coordinates": [
      [
        -76.1571749123324,
        39.6604801855121
      ],
      [
        -76.1567819152934,
        39.6600841799594
      ]
    ]
  },
  {
    "id": "89",
    "description": "Rock Run: confluence with the Susquehanna River.",
    "coordinates": [
      [
        -76.1270856644086,
        39.6138444084967
      ],
      [
        -76.1265271170488,
        39.6133500400672
      ]
    ]
  },
  {
    "id": "90",
    "description": "Mill Creek: Old Elk Neck Road.",
    "coordinates": [
      [
        -75.8608124890904,
        39.6009417922929
      ],
      [
        -75.8605146146004,
        39.6012282058246
      ]
    ]
  },
  {
    "id": "91",
    "description": "Principio Creek: Amtrak crossing below Maryland Route 7.",
    "coordinates": [
      [
        -76.0311838023107,
        39.5717530055367
      ],
      [
        -76.0306343602581,
        39.5718814791123
      ]
    ]
  },
  {
    "id": "92",
    "description": "North East River: Maryland Route 7.",
    "coordinates": [
      [
        -75.9482070590867,
        39.600311881985
      ],
      [
        -75.9475690084022,
        39.6005604066563
      ]
    ]
  },
  {
    "id": "93",
    "description": "Little Elk Creek: U.S. Route 40.",
    "coordinates": [
      [
        -75.8506121284263,
        39.6065857689604
      ],
      [
        -75.8498040173525,
        39.6064118066778
      ]
    ]
  },
  {
    "id": "94",
    "description": "Big Elk Creek: Maryland Route 213.",
    "coordinates": [
      [
        -75.8323237373168,
        39.6055596357065
      ],
      [
        -75.8318364938752,
        39.6052025494679
      ]
    ]
  },
  {
    "id": "95",
    "description": "Bohemia River: Telegraph Road.",
    "coordinates": [
      [
        -75.7761252025687,
        39.4654659602417
      ],
      [
        -75.7753289754812,
        39.4653099930479
      ]
    ]
  },
  {
    "id": "96",
    "description": "Happy Valley Branch: confluence with Susquehanna River.",
    "coordinates": [
      [
        -76.1056190633431,
        39.5945886425055
      ],
      [
        -76.1053457316563,
        39.5941490818652
      ]
    ]
  },
  {
    "id": "97",
    "description": "Chicamicomico River: U.S. Route 50.",
    "coordinates": [
      [
        -75.8806605535427,
        38.5124729663256
      ],
      [
        -75.8799950503054,
        38.5120452159328
      ]
    ]
  },
  {
    "id": "98",
    "description": "Transquaking River: dam at Higgins Mill Pond.",
    "coordinates": [
      [
        -75.9647561619673,
        38.5191442982732
      ],
      [
        -75.9645065982533,
        38.5187444817752
      ]
    ]
  },
  {
    "id": "99",
    "description": "Waters upstream of Old Post Road will be designated as nontidal waters, while waters downstream of Old Post Road will be designated as tidal waters",
    "coordinates": [
      [
        -76.140052172714,
        39.5203118570548
      ],
      [
        -76.1400347383554,
        39.520325305901
      ]
    ]
  },
  {
    "id": "100",
    "description": "Barren Creek: U.S. Route 50 Bridge",
    "coordinates": [
      [
        -75.7462637756649,
        38.4614290140904
      ],
      [
        -75.7458878217353,
        38.4613243177825
      ]
    ]
  }
];

