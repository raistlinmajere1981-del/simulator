import type {
  HelpPanelContent,
  HelpTermContent
} from './help-content';

export const HELP_TERMS_EN: readonly HelpTermContent[] = [
  {
    id: 'utc-offset',
    label: 'UTC offset',
    definition: 'The difference between local time and UTC. The same local clock reading represents different physical instants under different UTC offsets.',
    caution: 'Astronomy calculations need an explicit time-zone offset; local clock text alone is not a reproducible instant.'
  },
  {
    id: 'solar-elevation',
    label: 'Solar elevation',
    definition: 'The angular elevation of the Sun center relative to the local geometric horizon. 0° is the geometric horizon, positive values are above it and negative values are below it.',
    caution: 'The Stage 6.1 value does not include atmospheric refraction or a local topographic-horizon correction.'
  },
  {
    id: 'declination',
    label: 'Declination',
    definition: 'The north/south angular position of a celestial object relative to the celestial equator.'
  },
  {
    id: 'hour-angle',
    label: 'Hour angle',
    definition: 'The angle between the local meridian and the celestial object’s hour circle; it changes with time and location.'
  },
  {
    id: 'lunar-parallax',
    label: 'Lunar parallax',
    definition: 'The change in the apparent direction of the Moon, relative to its geocentric direction, caused by the observer’s position on Earth because the Moon is nearby.',
    caution: 'For the Moon it can approach degree scale, so it should not be ignored in local altitude/azimuth calculations.'
  },
  {
    id: 'lunar-phase',
    label: 'Lunar phase',
    definition: 'The fraction of the Moon’s sunlit hemisphere visible from Earth and the associated cycle state determined by Sun–Moon–Earth geometry.',
    caution: 'New Moon or Full Moon alone does not imply an eclipse; orbital-node geometry is also required.'
  },
  {
    id: 'gnomon',
    label: 'Gnomon',
    definition: 'A vertical reference rod of known height, aligned with the local vertical, used in a shadow experiment.',
    caution: 'If the gnomon is not vertical or the measurement surface is not horizontal, the simple L = h / tan(α) geometry carries systematic error.'
  },
  {
    id: 'datum',
    label: 'Datum',
    definition: 'Defines the vertical reference used for heights. Orthometric mean-sea-level height, WGS84 ellipsoidal height and a local datum are not interchangeable.',
    caution: 'Observer, target, terrain, water and atmospheric profiles should be interpreted in the same vertical reference.'
  },
  {
    id: 'fov',
    label: 'FOV',
    definition: 'Field of View. The total angle seen by a camera on the horizontal or vertical axis; it is used to convert pixel coordinates into viewing angles.',
    caution: 'A result based on an estimated FOV may only be suitable for testing. Real measurement requires camera/lens information or a verified FOV.'
  },
  {
    id: 'k',
    label: 'k refraction coefficient',
    definition: 'A dimensionless coefficient that represents ray curvature relative to Earth curvature through the effective-radius approximation in standard-atmosphere mode.',
    caution: 'A constant k is an approximate model that substitutes for the layered structure of the real atmosphere.'
  },
  {
    id: 'rss',
    label: 'RSS',
    definition: 'Root Sum Square. A method that combines uncertainty contributions assumed to be independent by taking the square root of the sum of their squares.',
    caution: 'If the components are not independent, RSS can understate the uncertainty.'
  },
  {
    id: 'provenance',
    label: 'Provenance',
    definition: 'Source information that records where a value came from, when it was obtained and which method/version produced it.'
  },
  {
    id: 'azimuth',
    label: 'Azimuth',
    definition: 'The horizontal direction angle measured clockwise from north. It is used for geodesic initial and final bearings.'
  },
  {
    id: 'geodesic',
    label: 'Geodesic',
    definition: 'A surface-dependent shortest-route calculation between two positions on a reference surface. Coordinate mode uses the WGS84 inverse geodesic solution.'
  },
  {
    id: 'orthometric',
    label: 'Orthometric height',
    definition: 'A physical height type referenced to the geoid/mean sea level.'
  },
  {
    id: 'ellipsoidal',
    label: 'Ellipsoidal height',
    definition: 'A geometric height measured from the WGS84 reference ellipsoid, commonly used by GNSS systems.'
  },
  {
    id: 'ciddor',
    label: 'Ciddor',
    definition: 'A family of physical formulas used to calculate the refractive index of air from temperature, pressure, humidity, CO₂ and wavelength.'
  },
  {
    id: 'dem',
    label: 'DEM',
    definition: 'Digital Elevation Model. Grid-based elevation data used to sample terrain heights along a route.',
    caution: 'DEM resolution, datum, NODATA regions and route-sampling interval limit measurement quality.'
  },
  {
    id: 'uncertainty',
    label: 'Uncertainty',
    definition: 'An accepted ± range for a measurement or input rather than a single exact number.',
    caution: 'User-entered ± ranges in this application do not automatically mean 1σ or any particular confidence level.'
  }
] as const;

export const HELP_PANELS_EN: readonly HelpPanelContent[] = [
  {
    id: 'scenario-summary',
    category: 'Experiment',
    title: 'Active scenario and core observation inputs',
    summary: 'Manages the main experiment inputs such as observer, target, distance/coordinates, visibility and standard refraction. Physical models solve the same experiment inputs independently.',
    fields: [
      { label: 'Eye height', unit: 'm', description: 'Height of the observer’s optical center above the local ground elevation.', calculationEffect: 'Directly affects horizon and target line-of-sight geometry.' },
      { label: 'Target height', unit: 'm', description: 'Physical height from the base to the top of the target object.', calculationEffect: 'Affects visible percentage and top angle.' },
      { label: 'Surface distance', unit: 'km', description: 'Distance along the surface between observer and target in manual mode.' },
      { label: 'Coordinate mode', description: 'Calculates geodesic distance and azimuths from WGS84 latitude/longitude pairs.' },
      { label: 'Observed visibility', unit: '%', description: 'Independently reported visible fraction of the target from the field or an image. It is used for result evaluation, not to generate model inputs.' }
    ],
    assumptions: ['Coordinate mode uses WGS84.', 'Manual distance and coordinate distance are not simultaneous physical distance sources.'],
    commonMistakes: ['Entering an estimated visibility percentage from a camera image as an exact measurement.', 'Confusing eye height with observer ground elevation.'],
    example: 'If the observer is 2 m above the ground, the target is 20 km away and 30 m tall, enter 2 m as eye height and 30 m as target height.',
    relatedTerms: ['geodesic', 'azimuth', 'k', 'uncertainty']
  },
  {
    id: 'celestial-time',
    category: 'Astronomy',
    title: 'Astronomical observation time',
    summary: 'Manages the reproducible physical instant for Sun/Moon/star calculations. Local date and time are converted to a UTC instant using an explicit UTC offset.',
    fields: [
      { label: 'Local date / time', description: 'Local calendar date and clock value recorded at the observation site.' },
      { label: 'UTC offset', description: 'The minute/hour difference between local time and UTC. It directly determines the calculated physical instant.' },
      { label: 'UTC', description: 'The unique physical instant derived from local time + offset and stored with the experiment.' }
    ],
    assumptions: ['The user has selected the correct UTC offset.', 'At this stage an explicit offset is stored as provenance instead of a time-zone name/DST rule.'],
    commonMistakes: ['Treating Türkiye local time as UTC.', 'Assuming today’s time-zone offset is automatically correct for a historical observation.'],
    example: '2026-08-08 21:30 with UTC+03:00 corresponds to the physical instant 2026-08-08T18:30:00Z.',
    relatedTerms: ['utc-offset', 'solar-elevation', 'hour-angle']
  },
  {
    id: 'solar-position',
    category: 'Astronomy',
    title: 'Geometric local position of the Sun',
    summary: 'An astronomical reference that calculates the geometric elevation and azimuth of the Sun center from the UTC observation instant and WGS84 observer coordinates.',
    fields: [
      { label: 'Geometric elevation', unit: '°', description: 'Angle of the Sun center relative to the geometric local horizon.' },
      { label: 'Azimuth', unit: '°', description: '0°–360° direction angle measured clockwise from geographic north.' },
      { label: 'Declination', unit: '°', description: 'Angular position of the Sun relative to the celestial equator.' },
      { label: 'Hour angle', unit: '°', description: 'Time angle of the Sun relative to the local meridian.' },
      { label: 'Equation of time', unit: 'min', description: 'Astronomical difference between mean solar time and apparent solar time.' }
    ],
    assumptions: ['Uses the low-cost astronomical approximation from the NOAA Solar Calculator equation set.', 'Atmospheric refraction is not applied.', 'Azimuth is clockwise from geographic north.'],
    commonMistakes: ['Assuming geometric 0° elevation is identical to the sea horizon in a photograph.', 'Treating negative elevation as a calculation error; it may mean the Sun is geometrically below the horizon.'],
    example: 'Changing the date or time at the same coordinates recalculates solar elevation and azimuth immediately.',
    relatedTerms: ['solar-elevation', 'azimuth', 'declination', 'hour-angle', 'utc-offset']
  },
  {
    id: 'solar-day-events',
    category: 'Astronomy',
    title: 'Sunrise, sunset and solar noon',
    summary: 'Calculates horizon crossings and the highest geometric position of the Sun for the selected WGS84 location and local civil day with an explicit UTC offset. Geometric 0° and the standard -0.833° apparent reference are kept separate.',
    fields: [
      { label: 'Geometric rise/set', unit: 'time', description: 'Events where the Sun center crosses the 0° geometric local-horizon threshold.' },
      { label: 'Standard apparent rise/set', unit: 'time', description: 'Approximate calendar reference using a fixed -0.833° threshold for the Sun center; it is not a measurement of the real atmosphere.' },
      { label: 'Time above threshold', unit: 'h/min', description: 'How long the Sun center remains above the selected threshold during the chosen local civil day.' },
      { label: 'Solar noon', unit: 'time', description: 'Instant of maximum geometric solar elevation within the selected local-day window.' },
      { label: 'Rise/set azimuth', unit: '°', description: 'Sun azimuth clockwise from geographic north at the corresponding threshold crossing.' }
    ],
    assumptions: ['The local day is constructed as 00:00–24:00 using the stored fixed UTC offset.', 'The 0° channel contains neither atmospheric refraction nor topographic horizon.', 'The -0.833° channel is a fixed upper-limb + standard-refraction approximation, not the measured field atmosphere.', 'This astronomical reference does not automatically assign Sun/light physics to Earth-shape models.'],
    commonMistakes: ['Treating the -0.833° result as measured real atmospheric refraction.', 'Assuming the local topographic horizon is identical to the flat geometric horizon.', 'Overlooking that the stored explicit UTC offset is used instead of a time-zone name/DST rule.', 'Expecting invented rise or set times during polar day/night.'],
    example: 'At the same date and coordinates, standard -0.833° sunrise is slightly earlier than geometric 0° center rise, while sunset is slightly later.',
    relatedTerms: ['solar-elevation', 'azimuth', 'utc-offset']
  },
  {
    id: 'lunar-position',
    category: 'Astronomy',
    title: 'Topocentric position and phase of the Moon',
    summary: 'Produces low-precision topocentric elevation/azimuth, distance and phase geometry for the Moon at the same UTC observation instant and WGS84 location.',
    fields: [
      { label: 'Geometric elevation', unit: '°', description: 'Topocentric angle of the Moon center relative to the local geometric horizon.' },
      { label: 'Azimuth', unit: '°', description: 'Direction of the Moon clockwise from geographic north.' },
      { label: 'Illuminated fraction', unit: '%', description: 'Approximate illuminated disk fraction calculated from Sun–Moon elongation.' },
      { label: 'Phase / lunar age', description: 'Approximate phase class and synodic age since the New Moon cycle.' },
      { label: 'Horizontal parallax', unit: '°', description: 'Scale of the large topocentric correction to celestial direction caused by the Moon’s proximity.' }
    ],
    assumptions: ['Uses a low-precision analytic lunar orbit with the principal periodic corrections.', 'The observer is assumed to be at sea level.', 'Atmospheric refraction and local topographic horizon are not applied.', 'Eclipse geometry is outside this panel’s scope.'],
    commonMistakes: ['Treating this low-precision reference as a JPL/Horizons-precision ephemeris.', 'Confusing illuminated fraction with whether the Moon is visible above the horizon.', 'Inferring an eclipse automatically from phase information.'],
    example: 'Changing date/time recalculates the Sun and Moon together at the same observation instant.',
    relatedTerms: ['azimuth', 'declination', 'utc-offset', 'lunar-parallax', 'lunar-phase']
  },
  {
    id: 'shadow-observation',
    category: 'Astronomy',
    title: 'Shadow experiment and vertical gnomon',
    summary: 'Uses the same UTC/WGS84 solar reference to predict the length and direction of a vertical gnomon shadow; an optional field measurement is compared only with user-supplied ± uncertainties.',
    fields: [
      { label: 'Gnomon height', unit: 'm', description: 'Physical height of the reference rod aligned with the local vertical.', calculationEffect: 'Scales expected shadow length linearly.' },
      { label: 'Observed shadow length', unit: 'm', description: 'Distance measured on the local horizontal surface from the gnomon base to the shadow tip.' },
      { label: 'Length uncertainty', unit: 'm', description: 'Explicit ± range of the field length measurement. Without it, the length channel does not produce an agreement decision.' },
      { label: 'Observed shadow azimuth', unit: '°', description: 'Direction from gnomon base to shadow tip, clockwise from geographic north.' },
      { label: 'Azimuth uncertainty', unit: '°', description: 'Explicit ± angular range of the shadow-direction measurement.' },
      { label: 'Solar elevation derived from shadow', unit: '°', description: 'Angle independently derived from measured length and gnomon height with atan2(h, L).' }
    ],
    assumptions: ['The gnomon is parallel to the local vertical.', 'The measurement surface is locally horizontal.', 'Solar elevation is geometric; atmospheric refraction and topographic horizon are not applied.', 'This astronomical reference does not assign physical Sun behavior to Earth models.'],
    commonMistakes: ['Assuming shadow direction equals solar azimuth; a shadow points approximately 180° opposite.', 'Using observer body height instead of gnomon height.', 'Expecting a definite agreement/disagreement decision without entering uncertainty.', 'Using a shadow measured on sloping ground as a horizontal-plane measurement.'],
    example: 'A 1 m vertical gnomon with a 1 m shadow corresponds to about 45° solar elevation in ideal horizontal geometry.',
    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'uncertainty', 'utc-offset']
  },
  {
    id: 'dual-shadow-comparison',
    category: 'Astronomy',
    title: 'Simultaneous two-location shadow comparison',
    summary: 'Solves vertical-gnomon shadows at points A and B at the same UTC physical instant; different gnomon heights are converted to angles to produce a common comparison channel.',
    fields: [
      { label: 'B latitude / longitude', unit: '°', description: 'WGS84 coordinates of the second field observation point.' },
      { label: 'B gnomon height', unit: 'm', description: 'Physical height of the vertical reference at the second point. It does not need to equal A.' },
      { label: 'B observed shadow', unit: 'm', description: 'Shadow length measured at the second point at the same UTC instant.' },
      { label: 'WGS84 point separation', unit: 'km', description: 'Geodesic reference distance between A and B; it is observation context, not a model prediction.' },
      { label: 'Solar-elevation difference B−A', unit: '°', description: 'Simultaneous difference between the two geometric solar elevations.' },
      { label: 'Difference from observed shadows', unit: '°', description: 'Difference between solar elevations derived independently from each shadow with atan2(h,L).' }
    ],
    assumptions: ['The two stations represent the same UTC physical instant.', 'Both gnomons are parallel to their local verticals and both measurement surfaces are locally horizontal.', 'Atmospheric refraction and topographic horizon are not applied.', 'The WGS84 baseline is a reference; it does not automatically assign a solar rule to Earth-shape models.'],
    commonMistakes: ['Treating matching local clock values in different time zones as simultaneous observations.', 'Directly comparing raw shadow lengths when gnomon heights differ.', 'Expecting a definite difference-agreement decision without uncertainty.', 'Inferring Earth radius or shape directly from this reference calculation.'],
    example: 'Point A may use a 1 m gnomon and point B a 2 m gnomon; compare solar elevations derived at each point rather than the raw shadow lengths in metres.',
    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'geodesic', 'uncertainty', 'utc-offset']
  },
  {
    id: 'text-experiment-setup',
    category: 'Experiment',
    title: 'Prepare experiment from text',
    summary: 'Converts a free-form observation note into a typed draft using deterministic rules. Detected values are not written to experiment state without user approval.',
    fields: [
      { label: 'Found', description: 'A field matched safely by unit, context and range; it can be applied if selected.' },
      { label: 'Review required', description: 'An expression with a missing unit, conflicting repetition or a need for additional physical context. It is not applied automatically.' },
      { label: 'Could not use', description: 'An expression that cannot be safely applied on its own under the current contract, such as a water level without provenance or an FOV without a photo.' },
      { label: 'Current → proposed', description: 'Shows the existing value beside the candidate extracted from text before anything is written to the form.' }
    ],
    assumptions: ['The first version is offline and rule-based; it does not use an external AI service.', 'No physical assumption is invented for values absent from the text.'],
    commonMistakes: ['Expecting a unitless number to be assumed to mean metres or kilometres.', 'Assuming a “review required” row will be applied automatically.', 'Treating prepare-from-text provenance as a replacement for the actual measurement source.'],
    example: '“Observer is 12 m above sea level, camera 1.7 m above ground; target is 34.2 km away and 42 m high; standard refraction k=0.13.” first becomes a draft preview.',
    relatedTerms: ['provenance', 'uncertainty', 'datum', 'k']
  },
  {
    id: 'photo-calibration',
    category: 'Photography',
    title: 'Photo / camera calibration',
    summary: 'Converts the reference line and target base/top in a photograph from pixel coordinates into an angular observation. The photo measurement is not fed back into model calculation; it is an independent observation channel.',
    fields: [
      { label: 'U1 / U2', description: 'Two points defining the reference line in the photograph. By default it is only a visual reference.' },
      { label: 'BASE / TOP', description: 'Physical lower and upper points of the target object to be measured.' },
      { label: 'Horizontal / vertical FOV', unit: '°', description: 'Total camera field of view. It is the main calibration parameter for pixel→angle conversion.' },
      { label: 'Mark uncertainty', unit: 'px', description: 'Possible position range of a mark point in the photograph.' },
      { label: 'Lens distortion', description: 'If the image has not been corrected, pixel→angle conversion can carry systematic error, especially near the edges.' }
    ],
    assumptions: ['Uses a pinhole camera model.', 'U1–U2 is treated as a physical local horizontal only when the user explicitly selects that interpretation.'],
    commonMistakes: ['Marking BASE and TOP in reverse.', 'Treating test-purpose FOV values as a real camera calibration.', 'Automatically treating the sea horizon as the local horizontal.'],
    relatedTerms: ['fov', 'uncertainty', 'provenance']
  },
  {
    id: 'atmosphere',
    category: 'Atmosphere',
    title: 'Atmosphere and optical refraction',
    summary: 'Selects between atmosphere off, the standard k approximation, or a measured layered meteorological profile.',
    fields: [
      { label: 'Standard k', description: 'Uses the effective-radius approximation for the Ideal Sphere.' },
      { label: 'Layered profile', description: 'Builds Ciddor refractive index and an RK4 ray path from height, temperature, pressure and humidity samples.' },
      { label: 'Vacuum wavelength', unit: 'nm', description: 'Light wavelength used in the optical refractive-index calculation.' },
      { label: 'Ray step', unit: 'm', description: 'Numerical step length of the RK4 ray trace; a smaller step is more expensive but gives finer resolution.' }
    ],
    assumptions: ['Layer heights are interpreted in the same vertical datum as the experiment.', 'No automatic meteorological extrapolation is performed outside profile coverage.'],
    commonMistakes: ['Assuming standard k and the layered profile are physically applied at the same time.', 'Using atmospheric heights from a different datum without conversion.'],
    relatedTerms: ['k', 'ciddor', 'datum', 'uncertainty']
  },
  {
    id: 'terrain-datum',
    category: 'Terrain and datum',
    title: 'Vertical reference, terrain and DEM',
    summary: 'Manages observer/target ground elevations, the common vertical-datum choice and the terrain profile along the route.',
    fields: [
      { label: 'Vertical datum', description: 'Determines the reference under which all elevations are interpreted.' },
      { label: 'Ground elevations', unit: 'm', description: 'Physical base elevations of observer and target.' },
      { label: 'Manual profile', description: 'User-defined intermediate distance/elevation points along the route.' },
      { label: 'DEM', description: 'Sampling grid-based terrain elevations along a coordinate route.' }
    ],
    assumptions: ['Profile points follow the same vertical-datum contract.', 'DEM resolution and coverage limits are preserved in the result trace.'],
    commonMistakes: ['Mixing ellipsoidal and orthometric elevations without conversion.', 'Treating DEM pixel/cell resolution as the actual measurement accuracy.'],
    relatedTerms: ['datum', 'orthometric', 'ellipsoidal', 'dem', 'provenance']
  },
  {
    id: 'water-surface',
    category: 'Water surface',
    title: 'Water level, tide and waves',
    summary: 'Records a water-surface observation with provenance and uncertainty; if the user chooses, it is applied in a controlled way only to observer/target endpoint elevations.',
    fields: [
      { label: 'Water level', unit: 'm', description: 'Water-surface elevation in the selected vertical datum.' },
      { label: 'Water-level uncertainty', unit: 'm', description: '± vertical range of the measurement/estimate source.' },
      { label: 'Wave vertical uncertainty', unit: 'm', description: 'Vertical variation range of the reference surface caused by instantaneous waves.' },
      { label: 'Significant wave height Hs', unit: 'm', description: 'Stored as source provenance; it is not an automatic geometric correction.' },
      { label: 'Maximum time difference', unit: 'min', description: 'Maximum accepted difference between water observation time and experiment time.' }
    ],
    assumptions: ['Water level and experiment endpoint elevations must use the same vertical datum.'],
    commonMistakes: ['Adding Hs directly to target elevation.', 'Treating a tide-prediction time as the time of a real measurement.'],
    relatedTerms: ['datum', 'uncertainty', 'rss', 'provenance']
  },
  {
    id: 'model-visualization',
    category: 'Models',
    title: 'Model visualizations',
    summary: 'Shows the sphere, defined plane and azimuthal reference in Three.js scenes. Visual layers do not feed back into the physical calculation engine.',
    fields: [
      { label: 'Ideal Sphere', description: '3D visual reference for the physical spherical model.' },
      { label: 'Defined Plane', description: 'Local plane geometry; no spherical coordinate projection is invented.' },
      { label: 'Azimuthal Display', description: 'A cartographic reference; by itself it is not a physical visibility model.' },
      { label: 'Atmosphere / topography layers', description: 'Visual representations of calculated data; they do not change calculation results.' }
    ],
    assumptions: ['Atmospheric and terrain heights may be visually exaggerated in the scene for readability.'],
    commonMistakes: ['Treating visual scaling as physical scaling.', 'Treating the azimuthal map itself as a physical flat-Earth model.'],
    relatedTerms: ['azimuth', 'geodesic', 'dem']
  },
  {
    id: 'model-uncertainty',
    category: 'Uncertainty',
    title: 'Model input uncertainty',
    summary: 'Without changing nominal model inputs, calculates how user-specified ± ranges affect the model’s angular prediction.',
    fields: [
      { label: 'Effective surface distance ±', unit: 'm', description: 'Accepted precision bound for distance.' },
      { label: 'Eye / ground / target ±', unit: 'm', description: 'Precision ranges for geometric height and elevation inputs.' },
      { label: 'k ±', description: 'Refraction-coefficient precision only in Standard k atmosphere mode.' },
      { label: 'Combination', description: 'Conservative linear sum, or RSS under an explicit independence assumption.' }
    ],
    assumptions: ['Entered ± values are deterministic sensitivity bounds; they are not automatic confidence intervals.'],
    commonMistakes: ['Treating an empty field as ±0.', 'Entering a number for an unmeasured uncertainty merely to fill the form.', 'Using RSS for components that are not independent.'],
    relatedTerms: ['uncertainty', 'rss', 'k']
  },
  {
    id: 'photo-comparison',
    category: 'Uncertainty',
    title: 'Photo angular-observation comparison',
    summary: 'Compares an independent angular observation from photo calibration with the model prediction after the model has been calculated from its own inputs.',
    fields: [
      { label: 'Photo ±', unit: '°', description: 'Observation envelope from pixel marking and the precision of defined camera parameters.' },
      { label: 'Model ±', unit: '°', description: 'Sensitivity of the angular prediction to the defined model-input ranges.' },
      { label: 'Combined ±', unit: '°', description: 'Total precision envelope used in the comparison under the selected combination method.' },
      { label: 'Absolute difference', unit: '°', description: 'Difference between nominal model angle and nominal photo angle.' }
    ],
    assumptions: ['The photograph does not feed the model.', 'No agreement score is assigned to an angle channel that is physically undefined.'],
    commonMistakes: ['Interpreting “compatible” as proof of a model or as a probability percentage.', 'Treating the visual U1–U2 reference as the local horizontal.'],
    relatedTerms: ['fov', 'uncertainty', 'rss']
  },
  {
    id: 'results',
    category: 'Models',
    title: 'Model result comparison',
    summary: 'Shows side by side the visibility, angle, horizon and evaluation results produced by each physical model from the same experiment inputs.',
    fields: [
      { label: 'Expected visibility', unit: '%', description: 'Model estimate for the visible fraction of the target.' },
      { label: 'Observation difference', description: 'Evaluation difference between the model result and the user observation.' },
      { label: 'Trace', description: 'Calculation trace showing formula, assumptions, intermediate values and model version.' }
    ],
    assumptions: ['An Unsupported result may mean that no physical rule is defined for that representation, not that the model data is missing.'],
    commonMistakes: ['Looking only at a score without reviewing the assumptions of different models.'],
    relatedTerms: ['provenance', 'uncertainty']
  },
  {
    id: 'calculation-scope',
    category: 'Data and traceability',
    title: 'Calculation scope and limits',
    summary: 'Summarizes which physical effects are included in this version and which features are only provenance/visualization.',
    fields: [],
    assumptions: ['This section reminds the user of interpretation limits; it does not add new physics to the experiment result.'],
    commonMistakes: ['Assuming an effect not listed here is automatically included in the calculation.'],
    relatedTerms: ['provenance', 'datum', 'ciddor', 'dem']
  },
  {
    id: 'data-manager',
    category: 'Data and traceability',
    title: 'Data manager, records and export',
    summary: 'Opens and deletes local experiment records and exports them as versioned .ggl.json / HTML reports.',
    fields: [
      { label: '.ggl.json', description: 'Carries experiment inputs, provenance, model versions and result snapshots; it does not embed photo bytes.' },
      { label: 'HTML report', description: 'Offline-readable/printable experiment report.' },
      { label: 'Calculation trace', description: 'Shows in an auditable form which formulas and assumptions produced the result.' }
    ],
    assumptions: ['The photo file itself is only an in-session preview; the record stores its provenance.'],
    commonMistakes: ['Treating experiment JSON as a raw photo archive.', 'Treating an old model snapshot as a current-model calculation.'],
    relatedTerms: ['provenance']
  }
] as const;
