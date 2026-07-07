/**
 * PolitiDex Alignment Tool
 * Extracted from index.html for maintainability.
 *
 * This is the Personalized Alignment Score Engine plus its supporting
 * subsystems (issue map, core national issues, evidence/category helpers,
 * account-match adjustment, and team-alignment rendering). It was already an
 * IIFE in the monolith, so it is moved here verbatim and loaded as a classic
 * (non-deferred) external script at the same document position — preserving the
 * exact global scope and execution order it had inline.
 *
 * Public API is exposed on `window.*` (e.g. window.ISSUE_MAP,
 * window._calcAlignmentScore, window.alignSetIntensity, window.alignSearch …).
 * External inputs read at runtime: CMP_DATA, PROFILES, ISSUE_STANCE_DATA,
 * getProfile, window._issueVerdict, window._polPositionMap.
 *
 * 5-point stance system (strongly_support / support / neutral / oppose /
 * strongly_oppose). Legacy 3-state values (strong / moderate / opposed) are
 * migrated on load, so previously-saved Alignment Signatures keep working.
 */
  // ════════════════════════════════════════════════════════════
  // PERSONALIZED ALIGNMENT SCORE ENGINE
  // ════════════════════════════════════════════════════════════
  (function() {
    var ALIGN_KEY = 'politidex_align_issues';
    var ALIGN_INT_KEY = 'politidex_align_intensity';
    var _alignIssues = new Set();
    // Optional per-issue stance overlay: { issueKey: <5-point level> }. The five
    // levels are strongly_support / support / neutral / oppose / strongly_oppose.
    // 'support' is the implicit default and is never stored, so an issue with no
    // entry here scores EXACTLY as a plain "I hold this position" pick did before —
    // that keeps every previously-saved Alignment Signature (a plain array of keys)
    // producing identical politician match %s. Stronger levels weight the issue more
    // heavily; oppose/strongly_oppose invert the match (a candidate who holds that
    // position scores low); neutral counts lightly and pulls toward the midpoint.
    var _alignIntensity = {};

    // ── 5-point stance system ──────────────────────────────────────────────
    // The exact level vocabulary, the implicit default, and the legacy migration
    // that keeps 3-state signatures (strong / moderate / opposed) valid.
    var ALIGN_LEVELS = ['strongly_support', 'support', 'neutral', 'oppose', 'strongly_oppose'];
    var ALIGN_DEFAULT_LEVEL = 'support';   // implied by a bare selection; never stored
    function _alignMigrateLevel(lvl) {
      if (lvl === 'strong')   return 'strongly_support';
      if (lvl === 'moderate') return 'support';
      if (lvl === 'opposed')  return 'oppose';
      return lvl;
    }
    // Scoring model for a stance level:
    //   agree  — true = holds the position, false = rejects it, null = neutral
    //   weight — multiplier on the issue's computed weight (stronger = heavier)
    function _alignLevelModel(level) {
      switch (_alignMigrateLevel(level)) {
        case 'strongly_support': return { agree: true,  weight: 1.7 };
        case 'neutral':          return { agree: null,  weight: 0.4 };
        case 'oppose':           return { agree: false, weight: 1.25 };
        case 'strongly_oppose':  return { agree: false, weight: 1.9 };
        case 'support':
        default:                 return { agree: true,  weight: 1.0 };
      }
    }
    // Short label + icon for the per-issue stance badge and any compact readouts.
    function _alignLevelMeta(level) {
      switch (_alignMigrateLevel(level)) {
        case 'strongly_support': return { icon: '💪', label: 'Strongly Support' };
        case 'neutral':          return { icon: '😐', label: 'Neutral' };
        case 'oppose':           return { icon: '👎', label: 'Oppose' };
        case 'strongly_oppose':  return { icon: '✋', label: 'Strongly Oppose' };
        case 'support':
        default:                 return { icon: '👍', label: 'Support' };
      }
    }
    // Expose the live overlay + helpers so surfaces in other <script> blocks
    // (the "How You Compare" comparison, Key Races breakdowns) read the SAME
    // stance vocabulary and current picks. Re-pointed whenever _alignIntensity
    // is reassigned (see _alignExposeIntensity below).
    function _alignExposeIntensity() { try { window._alignIntensity = _alignIntensity; } catch (e) {} }
    _alignExposeIntensity();
    try {
      window.ALIGN_LEVELS = ALIGN_LEVELS;
      window._alignMigrateLevel = _alignMigrateLevel;
      window._alignLevelModel = _alignLevelModel;
      window._alignLevelMeta = _alignLevelMeta;
    } catch (e) {}

    // Each topic now offers SEVERAL selectable positions (checkbox style) instead
    // of a forced "this side vs that side" pair — a visitor can agree with more
    // than one perspective on the same topic, and most topics include a balanced /
    // middle-ground option for people who don't fall neatly on one end.
    //
    // Each option carries the keywords/stanceKeys the engine already understands.
    // An optional `lean: 'R' | 'D'` is used only internally by the scoring engine
    // to nudge the per-position match toward candidates with a matching record
    // (see _alignApplyLean); it is intentionally NOT shown in the UI anymore, so
    // the tool reads as policy positions rather than party branding. Options with
    // no lean (including every balanced option) score purely on the candidate's
    // own record and behave exactly as the original non-directional issues did.
    //
    // `cat` assigns each option to one of the ALIGN_CATEGORIES below, which groups
    // the positions into the collapsible topic sections of the picker. `label` is
    // the full name (emoji + words) used in status lines, the Key Races breakdown
    // and the quick-adjust chips; `chip` is the position statement shown inside the
    // topic's option list. Both picker surfaces — the main "Personalized Alignment
    // Tool" and the "My Key Alignments" panel — are rendered from this single map,
    // so they can never drift out of sync, and the scoring engine treats every
    // selected position as its own weighted issue, so selecting several positions
    // in one topic simply blends their matches together.
    var ISSUE_MAP = {
      // ── Public Lands & Energy ──
      lands_preserve:     { label: '🏔 Protect Public Lands', chip: 'Protect public lands & wild places for future generations', cat: 'land', lean: 'D', stanceKeys: [], keywords: ['public land','public lands','land protection','land ownership','conservation','wilderness','national park','national monument','climate','air quality','recreation','great salt lake','blm','forest','environment'] },
      lands_balance:      { label: '⚖️ Balanced Land Use', chip: 'Allow grazing, recreation and limited energy on public land while protecting core wild areas', cat: 'land', stanceKeys: ['dataCenters'], keywords: ['public land','conservation','multiple use','responsible development','recreation','stewardship','grazing','forest','water','land management','balance'] },
      lands_local:        { label: '🤠 Local Land Control', chip: 'Transfer more federal land decisions to states and county governments', cat: 'land', stanceKeys: [], keywords: ['state land','land rights','local control','federal land','transfer','county','public land','grazing','states rights'] },
      lands_keep_public:  { label: '🏞 Keep Public Lands Public', chip: 'Keep public lands in public hands — oppose selling or transferring federal land to states or developers', cat: 'land', stanceKeys: [], keywords: ['public land','public lands','keep public lands','land sale','sell public land','land transfer','dispose of land','public access','hunting','fishing','recreation','blm','national forest','federal land'] },
      lands_energy:       { label: '⛏ Energy & Resource Development', chip: 'Expand domestic energy, mining & resource development', cat: 'land', lean: 'R', stanceKeys: ['dataCenters'], keywords: ['energy','oil','gas','drilling','mining','public land','state land','land rights','development','data center','grid','nuclear','fossil','extraction','growth','infrastructure'] },
      property_rights:    { label: '🏡 Private Property Rights', chip: 'Protect private property rights and limit government eminent-domain seizures', cat: 'land', stanceKeys: [], keywords: ['property rights','private property','eminent domain','land rights','property owner','takings','land use','homeowner','water right','seizure','condemnation','easement'] },

      // ── Taxes & Government ──
      lower_taxes:        { label: '💰 Cut Income & Business Taxes', chip: 'Cut income and business tax rates to shrink the size of government', cat: 'gov', lean: 'R', stanceKeys: ['debt'], keywords: ['tax','tax cut','income tax','corporate tax','fiscal','fiscal conservat','small government','deregulation','appropriation'] },
      tax_middle_class:   { label: '💵 Middle-Class Tax Relief', chip: 'Cut taxes for middle-class households through credits and a bigger standard deduction', cat: 'gov', stanceKeys: [], keywords: ['middle class','working families','tax cut','child tax credit','payroll tax','take-home pay','tax relief','standard deduction','cost of living'] },
      gov_waste:          { label: '🧹 Cut Waste, Not Services', chip: 'Cut duplicate programs and improper payments before raising any taxes', cat: 'gov', stanceKeys: ['debt'], keywords: ['waste','wasteful spending','government efficiency','fraud','accountability','audit','streamline','reform','spending cut','improper payments','duplicate programs'] },
      gov_regulation:     { label: '✂️ Cut Federal Red Tape', chip: 'Sunset outdated federal regulations and require a cost-benefit review of new ones', cat: 'gov', lean: 'R', stanceKeys: [], keywords: ['regulation','deregulation','red tape','regulatory reform','rules','compliance','bureaucracy','permitting reform','sunset','cost-benefit','paperwork reduction','overregulation'] },
      gov_balance:        { label: '⚖️ Balance the Budget', chip: 'Balance the budget over time using both targeted spending cuts and closing tax loopholes', cat: 'gov', stanceKeys: ['debt'], keywords: ['balanced budget','fiscal responsibility','deficit','debt','spending','accountability','efficiency','waste','reform','budget','bipartisan','tax loophole'] },
      gov_services:       { label: '🏛 Invest in Public Services', chip: 'Protect Social Security, Medicaid and public services — even if it means higher taxes on top earners', cat: 'gov', lean: 'D', stanceKeys: [], keywords: ['social safety','safety net','public service','investment','medicaid','social security','funding','social','community service','services','paid leave','minimum wage','affordable','top earners','wealth tax'] },
      social_security:    { label: '👵 Protect Social Security & Medicare', chip: 'Protect Social Security and Medicare benefits from cuts or privatization', cat: 'gov', stanceKeys: [], keywords: ['social security','medicare','retirement','seniors','senior','entitlement','earned benefits','benefits','pension','fixed income','elderly','retiree'] },
      national_debt:      { label: '📉 Tackle the National Debt', chip: 'Bring down the national debt and stop running huge yearly deficits', cat: 'gov', stanceKeys: ['debt'], keywords: ['national debt','debt','deficit','deficit spending','balanced budget','debt ceiling','fiscal responsibility','interest on the debt','overspending','spending','fiscal'] },
      // NOTE: property taxes are intentionally listed in two places — `prop_tax`
      // here under Taxes & Government frames it as a tax-policy question (relief &
      // caps), while `property_tax` under Housing & Cost of Living (below) frames
      // it as a housing-affordability question. The labels are worded distinctly so
      // the two don't read as accidental duplicates; both feed the same
      // economy_cost_of_living core bundle.
      prop_tax:           { label: '🏦 Property Tax Relief', chip: 'Lower or cap property taxes so rising home values don’t tax families and seniors out of their homes', cat: 'gov', stanceKeys: [], keywords: ['property tax','property taxes','real estate tax','home value','assessment','tax assessment','mill levy','homestead exemption','property tax relief','property tax cap','escrow','homeowner tax','circuit breaker','seniors','fixed income'] },

      // ── Immigration ──
      border_security:    { label: '🛡 Strong Border & Enforcement', chip: 'Finish border barriers and deport people here illegally', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['border','border security','immigration enforcement','wall','ice','deportation','illegal immigration','enforcement'] },
      immig_legal:        { label: '📋 Modernize Legal Immigration', chip: 'Expand and speed up merit-based and employment work visas', cat: 'immig', stanceKeys: [], keywords: ['legal immigration','work visa','h-1b','merit','green card','skilled worker','guest worker','visa backlog','employment','agriculture labor'] },
      immig_balance:      { label: '⚖️ Secure Border + Legal Pathways', chip: 'Pair strong border security with earned legal pathways', cat: 'immig', stanceKeys: ['border'], keywords: ['border','immigration','legal immigration','work visa','reform','enforcement','pathway','comprehensive','bipartisan','guest worker'] },
      immigration_reform: { label: '🤝 Pathways to Citizenship', chip: 'Create earned pathways to citizenship for long-settled immigrants', cat: 'immig', lean: 'D', stanceKeys: [], keywords: ['immigration reform','pathway','citizenship','dreamer','daca','asylum','refugee','immigrant','work visa'] },
      immig_fentanyl:     { label: '🚫 Stop Fentanyl & Cartels', chip: 'Crack down on fentanyl trafficking and the drug cartels behind it', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['fentanyl','cartel','cartels','drug trafficking','smuggling','border drugs','narcotics','interdiction','transnational','overdose','poison','drug epidemic'] },
      deportations:       { label: '🚨 Mass Deportations & Border Security', chip: 'Carry out large-scale deportations of people here illegally and fully lock down the border', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['deportation','deportations','mass deportation','mass deportations','border security','illegal immigration','ice','removal','remove','secure the border','interior enforcement'] },

      // ── Gun Policy ──
      gun_rights:         { label: '🔫 Protect Gun Rights', chip: 'Protect Second Amendment and the right to bear arms', cat: 'guns', lean: 'R', stanceKeys: ['gun'], keywords: ['gun rights','second amendment','2a','firearm','constitutional carry','nra','concealed carry'] },
      gun_balance:        { label: '⚖️ Rights + Common-Sense Safety', chip: 'Keep legal gun ownership but require universal background checks and red-flag laws', cat: 'guns', stanceKeys: ['gun'], keywords: ['background check','gun safety','second amendment','firearm','responsible','red flag','mental health','common sense','gun reform'] },
      gun_safety:         { label: '🦺 Stronger Gun Safety Laws', chip: 'Pass stronger gun safety laws to reduce gun violence', cat: 'guns', lean: 'D', stanceKeys: [], keywords: ['gun safety','gun control','background check','red flag','assault weapon','gun violence','gun reform'] },

      // ── Education ──
      school_choice:      { label: '🎓 School Choice & Education Freedom', chip: 'Fund vouchers and charters so families can pick their school', cat: 'edu', lean: 'R', stanceKeys: [], keywords: ['school choice','education choice','education freedom','voucher','vouchers','school vouchers','charter','scholarship','homeschool','parental rights','parental choice'] },
      edu_balance:        { label: '⚖️ Strengthen Every School', chip: 'Fully fund public schools while letting some funding follow students to other options', cat: 'edu', stanceKeys: [], keywords: ['public school','school funding','school choice','teacher','education','charter','accountability','student','classroom','reform'] },
      public_schools:     { label: '🍎 Invest in Public Schools', chip: 'Raise teacher pay and fund public schools and classrooms', cat: 'edu', lean: 'D', stanceKeys: [], keywords: ['public education','public school','teacher pay','teacher','school funding','education funding','student welfare','classroom'] },
      edu_college_cost:   { label: '🎓 Lower College & Trade Costs', chip: 'Make college and trade school affordable and cut student debt', cat: 'edu', stanceKeys: [], keywords: ['college cost','tuition','student debt','student loan','trade school','apprenticeship','community college','pell grant','higher education','workforce training','affordable'] },
      edu_parental:       { label: '👪 Parental Rights in Schools', chip: 'Give parents more say over curriculum, library materials and what their children are taught', cat: 'edu', stanceKeys: [], keywords: ['parental rights','parents bill of rights','curriculum transparency','library books','opt out','parental notification','parental consent','parents','classroom','what kids are taught','education'] },

      // ── Family, Children & Work ──
      child_care:         { label: '🧸 Affordable Child Care', chip: 'Cut child-care costs and expand access to pre-K and early learning', cat: 'family', stanceKeys: [], keywords: ['child care','childcare','daycare','pre-k','prek','preschool','early childhood','early learning','head start','working parents','family'] },
      paid_leave:         { label: '👶 Paid Family & Medical Leave', chip: 'Guarantee paid time off to care for a new baby or a sick loved one', cat: 'family', stanceKeys: [], keywords: ['paid leave','family leave','medical leave','maternity','paternity','fmla','parental leave','caregiver','time off','paid family leave'] },
      family_support:     { label: '🍼 Help Families with Kids', chip: 'Expand the child tax credit and support to help with the cost of raising children', cat: 'family', stanceKeys: [], keywords: ['child tax credit','family tax','dependent','raising children','cost of raising','per-child','family budget','working families','adoption','parents'] },

      // ── Healthcare ──
      healthcare_market:  { label: '💊 Market-Based Healthcare', chip: 'Lower costs through competition and price transparency', cat: 'health', lean: 'R', stanceKeys: ['healthcare'], keywords: ['market-based','market healthcare','aca repeal','obamacare','deregulation','health savings','price transparency','competition','private insurance','medicaid reform','healthcare cost'] },
      health_drug_prices: { label: '💉 Lower Prescription Drug Prices', chip: 'Cap and negotiate prescription drug prices for patients', cat: 'health', stanceKeys: ['healthcare'], keywords: ['prescription','drug price','insulin','medicare negotiation','pharmaceutical','pbm','out-of-pocket','medication cost','price cap','affordable'] },
      health_balance:     { label: '⚖️ Lower Costs, Keep Coverage', chip: 'Lower costs by keeping private insurance while adding a public option to compete', cat: 'health', stanceKeys: ['healthcare'], keywords: ['healthcare','health','cost','prescription','price transparency','coverage','insurance','medical','mental health','reform','affordable','public option'] },
      healthcare_costs:   { label: '💵 Lower Healthcare Costs', chip: 'Bring down the price of healthcare, hospital bills and medical care for families', cat: 'health', stanceKeys: ['healthcare'], keywords: ['healthcare costs','health care costs','medical costs','medical bills','hospital prices','hospital bills','price transparency','out-of-pocket','surprise billing','affordable care','cost of care'] },
      healthcare:         { label: '🏥 Expand Healthcare Access', chip: 'Expand healthcare access and coverage for everyone', cat: 'health', lean: 'D', stanceKeys: ['healthcare'], keywords: ['healthcare','health','medicaid','medicaid expansion','aca','coverage','uninsured','hospital','medical','mental health','insurance','prescription','public health','overdose'] },
      health_mental:      { label: '🧠 Mental Health & Addiction', chip: 'Expand mental-health care and fight the opioid and fentanyl crisis', cat: 'health', stanceKeys: ['healthcare'], keywords: ['mental health','addiction','opioid','fentanyl','overdose','substance abuse','suicide','behavioral health','recovery','treatment','crisis','drug epidemic','rehabilitation'] },
      health_rural:       { label: '🚑 Protect Rural Hospitals', chip: 'Keep rural hospitals, maternity wards and emergency care open and funded', cat: 'health', stanceKeys: ['healthcare'], keywords: ['rural hospital','rural health','critical access','emergency room','ambulance','maternity care','hospital closure','telehealth','rural healthcare','clinic','underserved','provider shortage'] },
      medical_freedom:    { label: '🩺 Medical Freedom', chip: 'Protect personal choice over vaccines and government medical mandates', cat: 'health', lean: 'R', stanceKeys: [], keywords: ['medical freedom','vaccine mandate','vaccine choice','informed consent','health freedom','no mandates','medical privacy','personal choice','conscience','natural immunity','bodily autonomy'] },

      // ── Economy & Jobs ──
      econ_growth:        { label: '📈 Pro-Growth Deregulation', chip: 'Roll back federal business regulations and keep taxes low to spur hiring and investment', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['economy','economic growth','deregulation','free market','pro-growth','business','investment','industry','jobs','entrepreneur'] },
      econ_smallbiz:      { label: '🏪 Help Small Businesses', chip: 'Cut the licensing fees, permits and paperwork that fall hardest on small businesses', cat: 'econ', stanceKeys: [], keywords: ['small business','main street','entrepreneur','startup','licensing','permitting','red tape','paperwork','local business','self-employed','franchise'] },
      econ_trade:         { label: '🏭 Protect American Jobs', chip: 'Use tariffs and trade rules to defend American manufacturing', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['trade','tariff','manufacturing','factory','american made','buy american','offshoring','supply chain','industry','china','jobs'] },
      tariffs_china:      { label: '🇨🇳 Tariffs on China & Unfair Trade', chip: 'Use tariffs to counter China and unfair trade practices and protect American workers', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['tariffs','tariff','china tariffs','china trade','china','trade war','unfair trade','trade deficit','offshoring','decoupling','made in america','protect american jobs'] },
      econ_balance:       { label: '⚖️ Balanced Prosperity', chip: 'Support business growth but keep worker protections, overtime and benefit rules in place', cat: 'econ', stanceKeys: [], keywords: ['economy','jobs','small business','workers','wage','cost of living','middle class','manufacturing','affordable','growth','opportunity'] },
      econ_workers:       { label: '🛠 Raise Wages & Protect Workers', chip: 'Raise the minimum wage and protect workers from exploitation', cat: 'econ', lean: 'D', stanceKeys: [], keywords: ['worker','workers','wage','minimum wage','union','labor','paid leave','overtime','collective bargaining','cost of living','affordable','middle class','jobs'] },
      econ_corp_account:  { label: '🏦 Corporate Accountability', chip: 'Use antitrust and anti-price-gouging enforcement to check large corporations', cat: 'econ', lean: 'D', stanceKeys: [], keywords: ['corporate accountability','price gouging','monopoly','antitrust','big corporation','wall street','profiteering','consumer protection','fair competition','executive pay'] },
      rural_ag:           { label: '🌾 Farmers & Rural Communities', chip: 'Support family farms, ranchers and rural communities with fair prices and access', cat: 'econ', stanceKeys: [], keywords: ['agriculture','farm','farmer','farming','ranch','rancher','rural','crop','livestock','farm bill','rural broadband','rural community','grazing','drought','water right'] },

      // ── Infrastructure & Transportation ──
      infrastructure:     { label: '🚧 Rebuild Roads & Bridges', chip: 'Invest in roads, bridges, water systems and the power grid', cat: 'infra', stanceKeys: [], keywords: ['infrastructure','roads','bridges','highway','public works','transportation','grid','power grid','water systems','airport','rebuild','construction'] },
      broadband:          { label: '📶 Universal Broadband', chip: 'Bring fast, affordable internet to rural and underserved communities', cat: 'infra', stanceKeys: [], keywords: ['broadband','internet access','rural broadband','digital divide','connectivity','fiber','high-speed internet','fcc','underserved'] },
      transit:            { label: '🚆 Public Transit & Transportation', chip: 'Expand reliable public transit and modern transportation options', cat: 'infra', lean: 'D', stanceKeys: [], keywords: ['public transit','transit','bus','rail','light rail','commuter','transportation','infrastructure','mobility','high-speed rail'] },

      // ── Water & Environment ──
      water:              { label: '💧 Water Conservation', chip: 'Conserve water and protect rivers and the Great Salt Lake from drying up', cat: 'enviro', stanceKeys: [], keywords: ['water','water right','water policy','drought','great salt lake','lake powell','bear river','conservation','colorado river'] },
      water_storage:      { label: '🚰 Water Storage & Infrastructure', chip: 'Build reservoirs, pipelines and recycling to secure future water supply', cat: 'enviro', stanceKeys: [], keywords: ['water','water storage','reservoir','dam','pipeline','infrastructure','water supply','recycling','water reuse','aquifer','lake powell pipeline','drought','colorado river'] },
      enviro_balance:     { label: '⚖️ Practical Stewardship', chip: 'Protect clean air and water while keeping responsible jobs in farming and energy', cat: 'enviro', stanceKeys: [], keywords: ['conservation','environment','stewardship','clean air','clean water','recreation','balance','wildlife','land','responsible'] },
      climate_action:     { label: '🌱 Climate Action & Clean Energy', chip: 'Act on climate and invest in clean energy', cat: 'enviro', lean: 'D', stanceKeys: [], keywords: ['climate','clean energy','renewable','renewables','emissions','carbon','greenhouse','solar','wind','pollution','environment','air quality','conservation','paris agreement','electric vehicle'] },
      enviro_energy:      { label: '⚡ Energy Independence', chip: 'Use every energy source — gas, nuclear and renewables — to keep power reliable and affordable', cat: 'enviro', lean: 'R', stanceKeys: [], keywords: ['energy','energy independence','nuclear','natural gas','oil','grid','reliable','affordable','all of the above','domestic energy','baseload'] },
      energy_production:  { label: '🛢 Expand Domestic Energy Production', chip: 'Unleash American oil, gas and nuclear to lower energy prices and boost independence', cat: 'enviro', lean: 'R', stanceKeys: [], keywords: ['energy production','domestic energy','drill baby drill','drill','oil','gas','oil gas','oil and gas','natural gas','nuclear energy','nuclear','energy independence','fossil fuels','pipeline','lng'] },
      disaster_resilience:{ label: '🔥 Wildfire & Disaster Resilience', chip: 'Prepare for wildfires, floods and droughts and speed up disaster recovery', cat: 'enviro', stanceKeys: [], keywords: ['wildfire','fire','drought','flood','flooding','disaster','fema','emergency','resilience','mitigation','recovery','natural disaster','preparedness'] },

      // ── Housing & Cost of Living ──
      housing:            { label: '🏠 Housing Affordability', chip: 'Make housing more affordable by boosting supply and lowering the cost to build and buy', cat: 'housing', stanceKeys: [], keywords: ['housing','housing affordability','affordable housing','home prices','housing cost','cost of housing','housing crisis','housing supply','home ownership','homeownership','rent','mortgage','starter home','zoning','shortage'] },
      housing_build:      { label: '🏗 Build More Housing', chip: 'Loosen zoning and permitting so more homes — including apartments — can be built', cat: 'housing', stanceKeys: [], keywords: ['housing','home building','zoning','permitting','supply','construction','development','affordable housing','housing cost','red tape','density'] },
      cost_living:        { label: '🛒 Tackle the Cost of Living', chip: 'Make lowering rent, grocery, gas and utility prices the top economic priority', cat: 'housing', stanceKeys: [], keywords: ['cost of living','inflation','affordable','rent','prices','grocery','gas prices','mortgage','family budget','wage','middle class','utilities'] },
      housing_support:    { label: '🏘 Affordable Housing & Renters', chip: 'Fund affordable housing and protect renters with assistance and limits on evictions', cat: 'housing', lean: 'D', stanceKeys: [], keywords: ['affordable housing','renter','rent','tenant','housing assistance','homeless','homelessness','public housing','housing voucher','eviction','low-income'] },
      homeless:           { label: '🏕 Homelessness Policy', chip: 'Tackle homelessness with shelter, mental-health and addiction services, and keeping public spaces clear', cat: 'housing', stanceKeys: [], keywords: ['homeless','homelessness','unhoused','homeless encampment','encampment','homeless shelter','shelter','housing first','panhandling','vagrancy','transient','street homelessness','tent','mental health','addiction','wraparound services'] },
      property_tax:       { label: '🏡 Lower Property Taxes (Housing)', chip: 'Cap property taxes so families and seniors can afford to stay in their homes', cat: 'housing', stanceKeys: [], keywords: ['property tax','property taxes','homeowner','home value','assessment','tax relief','seniors','fixed income','homestead','escrow'] },
      housing_first_time: { label: '🔑 Help First-Time Buyers', chip: 'Help first-time and young buyers afford their first home', cat: 'housing', stanceKeys: [], keywords: ['first-time buyer','first time home','down payment','starter home','young families','homeownership','home buyer','first home','american dream','mortgage rate','closing costs'] },

      // ── Criminal Justice & Public Safety ──
      back_police:        { label: '👮 Back Law Enforcement', chip: 'Fund police and impose tougher penalties for violent crime', cat: 'justice', lean: 'R', stanceKeys: [], keywords: ['police','law enforcement','public safety','crime','tough on crime','fund the police','sheriff','violent crime','fentanyl','cartel','border crime','safety'] },
      tough_on_crime:     { label: '🚔 Tough on Crime', chip: 'Crack down on crime with strong policing and tougher sentences for offenders', cat: 'justice', lean: 'R', stanceKeys: [], keywords: ['tough on crime','law and order','crime','violent crime','policing','police','criminal justice','repeat offenders','sentencing','safe streets','retail theft'] },
      justice_balance:    { label: '⚖️ Safe & Fair Justice', chip: 'Fund police while adding training, body cameras and accountability for misconduct', cat: 'justice', stanceKeys: [], keywords: ['public safety','police','criminal justice','reform','accountability','community policing','safer communities','due process','rehabilitation','fair','balanced'] },
      justice_reform:     { label: '🤝 Criminal Justice Reform', chip: 'Reform sentencing and reduce mass incarceration', cat: 'justice', lean: 'D', stanceKeys: [], keywords: ['criminal justice reform','sentencing','incarceration','prison','first step act','bail reform','mass incarceration','reentry','rehabilitation','second chance','clemency','police reform'] },
      cannabis_reform:    { label: '🌿 Cannabis Reform', chip: 'Legalize or decriminalize cannabis and clear past low-level convictions', cat: 'justice', stanceKeys: [], keywords: ['cannabis','marijuana','legalization','legalize','decriminalize','expunge','expungement','drug policy','hemp','recreational','medical marijuana'] },

      // ── Abortion & Reproductive Rights ──
      pro_life:           { label: '🕊 Pro-Life Protections', chip: 'Protect the unborn and limit abortion', cat: 'repro', lean: 'R', stanceKeys: [], keywords: ['pro-life','pro life','abortion','unborn','life','sanctity of life','heartbeat','dobbs','defund planned parenthood','adoption'] },
      repro_balance:      { label: '⚖️ Limits With Exceptions', chip: 'Allow early-term access with limits and clear exceptions', cat: 'repro', stanceKeys: [], keywords: ['abortion','reproductive','exceptions','rape','incest','life of the mother','viability','state','moderate','common ground','contraception'] },
      pro_choice:         { label: '✊ Protect Reproductive Rights', chip: 'Protect abortion access and reproductive freedom', cat: 'repro', lean: 'D', stanceKeys: [], keywords: ['reproductive rights','abortion rights','pro-choice','pro choice','roe','reproductive freedom','women\'s health','planned parenthood','bodily autonomy','contraception'] },

      // ── Civil Rights & LGBTQ+ ──
      religious_liberty:  { label: '⛪ Religious Liberty Focus', chip: 'Protect religious freedom and conscience rights', cat: 'rights', lean: 'R', stanceKeys: [], keywords: ['religious liberty','religious freedom','faith','conscience','traditional values','first amendment','parental rights','free exercise'] },
      rights_balance:     { label: '⚖️ Equal Treatment for All', chip: 'Protect equal treatment in jobs and housing while protecting religious conscience', cat: 'rights', stanceKeys: [], keywords: ['civil rights','equality','equal treatment','fairness','anti-discrimination','tolerance','respect','liberty','balanced','common ground'] },
      lgbtq_rights:       { label: '🏳️‍🌈 Protect LGBTQ+ Rights', chip: 'Protect LGBTQ+ rights and anti-discrimination laws', cat: 'rights', lean: 'D', stanceKeys: [], keywords: ['lgbtq','lgbt','gay','transgender','marriage equality','respect for marriage','anti-discrimination','equality','civil rights','pride','equal protection'] },
      free_speech:        { label: '🗣 Free Speech Protections', chip: 'Protect free speech and limit government and Big Tech censorship', cat: 'rights', stanceKeys: [], keywords: ['free speech','first amendment','censorship','deplatform','viewpoint','expression','speech','big tech censorship','content moderation','silenced'] },
      end_dei:            { label: '🚫 End DEI Programs', chip: 'End diversity, equity and inclusion mandates in government and schools in favor of merit', cat: 'rights', lean: 'R', stanceKeys: [], keywords: ['dei','dei programs','diversity equity inclusion','diversity','equity','inclusion','end dei','anti-dei','anti dei','merit','merit based','meritocracy','affirmative action','colorblind','woke','wokeness','identity politics','critical race theory','crt'] },

      // ── Foreign Policy & Defense ──
      strong_defense:     { label: '🦅 Peace Through Strength', chip: 'Maintain the strongest military and stand firm abroad', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['national defense','military','defense spending','ndaa','peace through strength','national security','armed forces','deterrence','china','adversaries','strong military'] },
      foreign_balance:    { label: '⚖️ Strategic Engagement', chip: 'Keep a strong military but lead through NATO and allied diplomacy, not solo action', cat: 'foreign', stanceKeys: [], keywords: ['foreign policy','diplomacy','alliances','nato','national security','strategic','allies','defense','engagement','statecraft','bipartisan'] },
      restraint:          { label: '🕊 Diplomacy & Restraint', chip: 'Prioritize diplomacy and limit foreign military intervention', cat: 'foreign', stanceKeys: [], keywords: ['diplomacy','restraint','end endless wars','foreign aid','intervention','peace','de-escalation','troops home','war powers','negotiation'] },
      america_first:      { label: '🇺🇸 America First', chip: 'Put U.S. interests first and avoid foreign entanglements', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['america first','foreign aid','sovereignty','national interest','entanglement','ukraine aid','nation building','trade','tariff','border'] },
      america_first_fp:   { label: '🌐 America First Foreign Policy', chip: 'Put U.S. interests first, end endless wars and rethink foreign aid commitments', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['america first','foreign policy','endless wars','end endless wars','ukraine aid','foreign aid','nation building','sovereignty','national interest','no more wars','entanglement'] },
      veterans:           { label: '🎖 Take Care of Veterans', chip: 'Deliver better healthcare, benefits and support for the men and women who served', cat: 'foreign', stanceKeys: [], keywords: ['veteran','veterans','va','veterans affairs','gi bill','servicemember','service member','military families','va health','troops','wounded warrior','military service'] },

      // ── Technology & Privacy ──
      tech_innovation:    { label: '🚀 Innovation & Light Rules', chip: 'Let American tech and AI innovate with minimal red tape', cat: 'tech', lean: 'R', stanceKeys: [], keywords: ['technology','innovation','ai','artificial intelligence','deregulation','tech leadership','startup','crypto','light touch','competitiveness','semiconductor'] },
      tech_balance:       { label: '⚖️ Smart Tech Guardrails', chip: 'Let tech innovate but require data-privacy, online-safety and age-verification rules', cat: 'tech', stanceKeys: ['dataCenters'], keywords: ['technology','ai','guardrails','regulation','innovation','safety','age verification','social media','consumer protection','balanced','modernization'] },
      aidc:               { label: '🖥 AI Data Centers', chip: 'Welcome large AI data centers for the jobs, investment and tax revenue they bring', cat: 'tech', stanceKeys: ['dataCenters'], keywords: ['data center','data centers','datacenter','datacenters','ai data center','ai data centers','ai data','artificial intelligence','server farm','hyperscale','power demand','power grid','electricity','energy demand','grid','water usage','water use','cooling','tax revenue','tax base','economic development','jobs','investment','ratepayers','utility bills','emissions','environment','environmental'] },
      privacy_rights:     { label: '🔒 Privacy & Big-Tech Accountability', chip: 'Protect personal data and hold Big Tech accountable', cat: 'tech', stanceKeys: [], keywords: ['privacy','data privacy','surveillance','fisa','section 702','big tech','data','section 230','antitrust','consumer protection','encryption','warrant'] },

      // ── Elections & Democracy ──
      election_integrity: { label: '🗳 Election Integrity', chip: 'Secure elections with voter ID and audits', cat: 'democracy', lean: 'R', stanceKeys: ['campaign'], keywords: ['election integrity','voter id','election security','audit','clean elections','citizenship verification','ballot security','fraud','voter rolls'] },
      voter_id:           { label: '🪪 Voter ID & Election Integrity', chip: 'Require photo ID to vote and tighten safeguards against voter fraud', cat: 'democracy', lean: 'R', stanceKeys: ['campaign'], keywords: ['voter id','voter identification','photo id','election integrity','voter fraud','ballot security','clean elections','citizenship verification','proof of citizenship'] },
      democracy_balance:  { label: '⚖️ Secure & Accessible Voting', chip: 'Require voter ID but keep early voting and mail ballots widely available', cat: 'democracy', stanceKeys: ['termLimits','campaign'], keywords: ['voting','elections','secure','accessible','bipartisan','term limits','transparency','accountability','reform','campaign finance','redistricting','voter id','mail voting','early voting'] },
      voting_access:      { label: '📩 Expand Voting Access', chip: 'Protect and expand access to the ballot box', cat: 'democracy', lean: 'D', stanceKeys: [], keywords: ['voting rights','voting access','ballot access','mail voting','early voting','automatic registration','john lewis','enfranchise','expand voting','democracy'] },

      // ── Government Reform & Term Limits ──
      term_limits:        { label: '⏳ Term Limits for Congress', chip: 'Set term limits so Congress gets fresh faces instead of career politicians', cat: 'reform', stanceKeys: ['termLimits'], keywords: ['term limit','term limits','career politician','citizen legislator','rotation in office','government reform','accountability','revolving door'] },
      gov_transparency:   { label: '🔍 Transparency & Anti-Corruption', chip: 'Force more disclosure, ban member stock trading and toughen ethics rules', cat: 'reform', stanceKeys: ['campaign'], keywords: ['transparency','ethics','anti-corruption','disclosure','stock trading','insider trading','accountability','open government','dark money','lobbying','conflict of interest','government reform','swamp'] },
      campaign_finance:   { label: '💸 Get Money Out of Politics', chip: 'Limit big money and super-PAC influence over our elections', cat: 'reform', lean: 'D', stanceKeys: ['campaign'], keywords: ['campaign finance','super pac','dark money','citizens united','money in politics','small donor','public financing','lobbying','special interests','election reform','disclosure'] },
      audit_spending:     { label: '🧾 Audit Spending & the Fed', chip: 'Audit federal agencies and the Federal Reserve and root out wasteful spending', cat: 'reform', lean: 'R', stanceKeys: ['audit','debt'], keywords: ['audit','audit the fed','federal reserve','wasteful spending','spending','government efficiency','accountability','deficit','debt','fraud','government waste','improper payments','duplicate programs'] },
      cut_spending:       { label: '✂️ Cut Federal Spending & Reduce Debt', chip: 'Slash federal spending and the national debt by cutting waste and shrinking government', cat: 'reform', lean: 'R', stanceKeys: ['debt','audit'], keywords: ['federal spending','cut spending','spending cuts','national debt','government waste','doge','deficit','shrink government','fiscal responsibility','overspending','bloat'] },
      stock_trading_ban:  { label: '🚫 Ban Congressional Stock Trading', chip: 'Ban members of Congress from trading individual stocks while in office', cat: 'reform', stanceKeys: ['campaign'], keywords: ['stock trading','congressional stock','member stock','insider trading','stock act','trading ban','financial conflict','conflict of interest','ban stock','blind trust','self-dealing','transparency'] },
      scotus_reform:      { label: '⚖️ Supreme Court Reform', chip: 'Set an ethics code and term limits for Supreme Court justices', cat: 'reform', stanceKeys: ['termLimits'], keywords: ['supreme court','scotus','judicial','court reform','term limits','justices','ethics code','court ethics','judiciary','high court','recusal'] },
      reform_balance:     { label: '⚖️ Practical Government Reform', chip: 'Make government work better through common-sense efficiency, ethics and accountability', cat: 'reform', stanceKeys: ['termLimits','campaign'], keywords: ['government reform','efficiency','accountability','bipartisan','good governance','modernize','reform','transparency','ethics','term limits','common sense'] }
    };

    // Publish ISSUE_MAP on window so the many helper functions that live in OTHER
    // <script> blocks (Stance at a Glance category coloring, the Spotlight issue-tie
    // chips, the candidate Snapshot, the Evidence Locker's issue labels, and the
    // People's Mandate bridge) can read the SAME issue vocabulary. Those helpers
    // reference a bare `ISSUE_MAP`, which only resolves to this IIFE-scoped variable
    // once it is also a global — without this line they silently fell back to ''
    // (no issue label, no tie chip), so connections that should have been visible
    // were quietly dropped. `_alignIssueMap` remains as the historical alias.
    try { window.ISSUE_MAP = ISSUE_MAP; } catch (e) {}

    // ════════════════════════════════════════════════════════════
    // CORE NATIONAL ISSUES — the priority framework (2026)
    // ════════════════════════════════════════════════════════════
    // PolitiDex narrows its federal coverage toward the highest-salience national
    // issues so the Evidence Locker and politician profiles go DEEP on what voters
    // weigh most, rather than spreading thin across many small topics. Each core
    // issue below is a curated bundle of one or more ISSUE_MAP issueKeys (the
    // same vocabulary every stance, evidence item, and Alignment pick already
    // uses). A politician "covers" a core issue when any of their documented
    // stances or evidence is keyed to one of that issue's `keys`.
    //
    // This is purely additive metadata: it never changes how an individual stance
    // is written or scored. It powers the "core issues covered" readout in the
    // Evidence Locker's By-Politician view and gives future content passes a clear,
    // shared target list. The set is ordered by 2026 salience. Keys are validated
    // against ISSUE_MAP by scripts/define-core-national-issues-jun2026.mjs.
    var CORE_NATIONAL_ISSUES = [
      { key: 'economy_cost_of_living', label: '💵 Economy, Inflation & Cost of Living',
        blurb: 'Jobs, wages, inflation, taxes on households, and the price of everyday life.',
        keys: ['cost_living','tax_middle_class','prop_tax','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing','housing_build','housing_support','housing_first_time','homeless','property_tax','tariffs_china'] },
      { key: 'immigration_border', label: '🛡 Immigration & Border Security',
        blurb: 'Border enforcement, legal immigration, asylum, and fentanyl trafficking.',
        keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl','deportations'] },
      { key: 'healthcare', label: '🏥 Healthcare Costs & Access',
        blurb: 'Coverage, premiums, drug prices, rural care, mental health, and senior benefits.',
        keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security','healthcare_costs'] },
      { key: 'spending_debt_waste', label: '🧾 Government Spending, Debt & Waste',
        blurb: 'Federal spending, the national debt, balanced budgets, and rooting out waste.',
        keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation','cut_spending'] },
      { key: 'abortion_repro', label: '🕊 Abortion / Reproductive Rights',
        blurb: 'Abortion access, limits and exceptions, and reproductive freedom.',
        keys: ['pro_life','repro_balance','pro_choice'] },
      { key: 'guns', label: '🔫 Gun Rights & Gun Control',
        blurb: 'Second Amendment rights, background checks, red-flag laws, and gun-safety measures.',
        keys: ['gun_rights','gun_balance','gun_safety'] },
      { key: 'climate_energy', label: '🌱 Climate Change & Energy Policy',
        blurb: 'Climate action, clean and domestic energy, water, and disaster resilience.',
        keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','aidc','disaster_resilience','water','water_storage','energy_production'] },
      { key: 'crime_safety', label: '👮 Crime & Public Safety',
        blurb: 'Policing, violent crime, sentencing and justice reform, and public safety.',
        keys: ['back_police','justice_balance','justice_reform','cannabis_reform','tough_on_crime'] },
      { key: 'election_integrity', label: '🗳 Election Integrity',
        blurb: 'Election security, voter ID, ballot access, and the integrity of the vote.',
        keys: ['election_integrity','democracy_balance','voting_access','voter_id'] },
      { key: 'education_parental', label: '🎓 Education & Parental Rights',
        blurb: 'Public schools, school choice, college and trade costs, and parents’ role in schools.',
        keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
      { key: 'civil_rights_culture', label: '⚖️ Civil Rights, Culture & DEI',
        blurb: 'Equal treatment and civil rights, religious liberty, free speech, and the debate over DEI.',
        keys: ['religious_liberty','rights_balance','lgbtq_rights','free_speech','end_dei'] },
      { key: 'foreign_policy_defense', label: '🦅 Foreign Policy & National Security',
        blurb: 'National defense, alliances and diplomacy, America First priorities, and support for veterans.',
        keys: ['strong_defense','foreign_balance','restraint','america_first','america_first_fp','veterans'] },
    ];
    try { window.CORE_NATIONAL_ISSUES = CORE_NATIONAL_ISSUES; } catch (e) {}

    // Reverse lookup: which core issue (if any) an ISSUE_MAP key belongs to. Built
    // once so surfaces can ask "is this stance a core national issue?" cheaply.
    // Returns the core-issue object, or null for keys outside the priority set.
    var _CORE_BY_KEY = Object.create(null);
    CORE_NATIONAL_ISSUES.forEach(function (ci) { ci.keys.forEach(function (k) { if (!_CORE_BY_KEY[k]) _CORE_BY_KEY[k] = ci; }); });
    try { window.coreIssueForKey = function (k) { return (k && _CORE_BY_KEY[k]) || null; }; } catch (e) {}

    // Ordered category list that drives the collapsible picker sections. Issues are
    // slotted into a category via their `cat` key (above), so adding a new issue is
    // a one-line change here-or-there and both picker surfaces pick it up for free.
    // `group` slots each topic under a labelled section divider in the picker so a
    // long list of topics reads as a few digestible groups instead of one big wall.
    var ALIGN_CATEGORIES = [
      { key: 'gov',        group: 'Economy & Government',          icon: '💰', label: 'Taxes & Government' },
      { key: 'econ',       group: 'Economy & Government',          icon: '📈', label: 'Economy & Jobs' },
      { key: 'housing',    group: 'Economy & Government',          icon: '🏠', label: 'Housing & Cost of Living' },
      { key: 'infra',      group: 'Economy & Government',          icon: '🚧', label: 'Infrastructure & Transportation' },
      { key: 'land',       group: 'Land, Energy & Environment',    icon: '🏔', label: 'Public Lands & Energy' },
      { key: 'enviro',     group: 'Land, Energy & Environment',    icon: '💧', label: 'Water & Environment' },
      { key: 'immig',      group: 'Security & Justice',            icon: '🛡', label: 'Immigration' },
      { key: 'guns',       group: 'Security & Justice',            icon: '🔫', label: 'Gun Policy' },
      { key: 'justice',    group: 'Security & Justice',            icon: '👮', label: 'Criminal Justice & Safety' },
      { key: 'foreign',    group: 'Security & Justice',            icon: '🦅', label: 'Foreign Policy & Defense' },
      { key: 'health',     group: 'Health, Education & Society',   icon: '🏥', label: 'Healthcare' },
      { key: 'edu',        group: 'Health, Education & Society',   icon: '🎓', label: 'Education' },
      { key: 'family',     group: 'Health, Education & Society',   icon: '🧸', label: 'Family, Children & Work' },
      { key: 'repro',      group: 'Health, Education & Society',   icon: '🕊', label: 'Abortion & Reproductive Rights' },
      { key: 'rights',     group: 'Health, Education & Society',   icon: '🏳️‍🌈', label: 'Civil Rights & LGBTQ+' },
      { key: 'tech',       group: 'Technology & Democracy',        icon: '🚀', label: 'Technology & Privacy' },
      { key: 'democracy',  group: 'Technology & Democracy',        icon: '🗳', label: 'Elections & Democracy' },
      { key: 'reform',     group: 'Technology & Democracy',        icon: '⏳', label: 'Government Reform & Term Limits' }
    ];

    // ── Issue-vocabulary bridge for the "My Priorities" dashboard ──────────
    // The Home Team priorities view lives in a different scope and needs to
    // read the SAME issue vocabulary the Alignment Tool uses, without copying
    // it. Expose just two read-only lookups so the two can never drift:
    //   • _pdxIssueCatOf(issueKey) → the category key an issue belongs to
    //   • _pdxIssueCategories()    → the ordered, grouped topic list (key / icon
    //     / label / group), which is exactly the unit a voter picks as a
    //     "priority" (e.g. Taxes & Government, Healthcare, Housing).
    window._pdxIssueCatOf = function (issueKey) {
      try { return (ISSUE_MAP[issueKey] || {}).cat || ''; } catch (e) { return ''; }
    };
    window._pdxIssueCategories = function () {
      try {
        return ALIGN_CATEGORIES.map(function (c) {
          return { key: c.key, icon: c.icon, label: c.label, group: c.group };
        });
      } catch (e) { return []; }
    };
    // Resolve a single category descriptor by key (or null).
    window._pdxIssueCategory = function (catKey) {
      try {
        for (var i = 0; i < ALIGN_CATEGORIES.length; i++) {
          if (ALIGN_CATEGORIES[i].key === catKey) {
            var c = ALIGN_CATEGORIES[i];
            return { key: c.key, icon: c.icon, label: c.label, group: c.group };
          }
        }
      } catch (e) {}
      return null;
    };

    // ── Broad evidence Categories ──────────────────────────────────────────
    // A small, high-level layer that sits ABOVE the 18 fine-grained issue
    // topics (the `cat` key on every ISSUE_MAP entry). Each of those 18 topics
    // rolls up into exactly ONE of these ten Categories, so a regular voter
    // can browse the Evidence Locker by a broad subject ("Healthcare")
    // instead of a specific issue key — while the existing Issue filter still
    // offers the precise topic. Immigration is its own top-level Category
    // (not folded into Public Safety): it spans five distinct issue topics —
    // from border enforcement and fentanyl/cartels to legal immigration and
    // pathways to citizenship — so filing it under Public Safety would both
    // editorialize the subject and bury a sizable, cross-spectrum bucket.
    //
    // The lookup chain is issueKey → cat (already on ISSUE_MAP) → category
    // (here). Because it pivots on `cat`, adding a brand-new issue needs no
    // change here as long as its `cat` is one of the keys mapped below — the
    // Category is inherited for free. This is the single source of truth the
    // Evidence Locker reads from, so the two surfaces can never drift.
    var EVIDENCE_CATEGORIES = [
      { key: 'taxes_economy',   icon: '💰', label: 'Taxes & Economy' },
      { key: 'education',       icon: '🎓', label: 'Education' },
      { key: 'health_human',    icon: '🏥', label: 'Healthcare' },
      { key: 'housing',         icon: '🏠', label: 'Housing' },
      { key: 'safety_justice',  icon: '🛡', label: 'Public Safety' },
      { key: 'immigration',     icon: '🛂', label: 'Immigration' },
      { key: 'enviro_land',     icon: '🌿', label: 'Environment & Energy' },
      { key: 'gov_elections',   icon: '🏛', label: 'Government & Elections' },
      { key: 'transport_infra', icon: '🚧', label: 'Transportation & Infrastructure' },
      { key: 'other',           icon: '🎯', label: 'Other / General' }
    ];
    // Roll each of the 18 fine-grained issue topics (`cat`) up to a Category.
    // Every `cat` value used in ISSUE_MAP must appear here; anything missing
    // (or an item with no tracked issue) falls back to 'other'.
    var CAT_TO_CATEGORY = {
      gov: 'taxes_economy', econ: 'taxes_economy',
      edu: 'education',
      health: 'health_human', family: 'health_human',
      housing: 'housing',
      justice: 'safety_justice', guns: 'safety_justice', immig: 'immigration',
      land: 'enviro_land', enviro: 'enviro_land',
      democracy: 'gov_elections', reform: 'gov_elections', rights: 'gov_elections', repro: 'gov_elections',
      infra: 'transport_infra',
      foreign: 'other', tech: 'other', other: 'other'
    };
    // issueKey → broad Category key (always returns a valid key, default 'other').
    window._pdxCategoryOf = function (issueKey) {
      try {
        var cat = (ISSUE_MAP[issueKey] || {}).cat || '';
        return CAT_TO_CATEGORY[cat] || 'other';
      } catch (e) { return 'other'; }
    };
    // Fine-grained `cat` key → broad Category key.
    window._pdxCategoryFromCat = function (catKey) {
      return CAT_TO_CATEGORY[catKey] || 'other';
    };
    // issueKey → broad Category label (e.g. 'Public Safety'), used so a power-tie
    // reason on an Alignment row reads with the same wording as the Locker.
    var _CATEGORY_LABEL = {};
    EVIDENCE_CATEGORIES.forEach(function (c) { _CATEGORY_LABEL[c.key] = c.label; });
    window._pdxCategoryLabelOf = function (issueKey) {
      try { return _CATEGORY_LABEL[window._pdxCategoryOf(issueKey)] || 'this area'; }
      catch (e) { return 'this area'; }
    };
    // The ordered list of broad Categories (key / icon / label) for filters.
    window._pdxEvidenceCategories = function () {
      try {
        return EVIDENCE_CATEGORIES.map(function (c) {
          return { key: c.key, icon: c.icon, label: c.label };
        });
      } catch (e) { return []; }
    };
    // Resolve one broad Category descriptor by key (or null).
    window._pdxEvidenceCategory = function (key) {
      for (var i = 0; i < EVIDENCE_CATEGORIES.length; i++) {
        if (EVIDENCE_CATEGORIES[i].key === key) return EVIDENCE_CATEGORIES[i];
      }
      return null;
    };

    // ── Data-driven picker rendering ───────────────────────────
    // Both the main "Personalized Alignment Tool" and the "My Key Alignments"
    // panel mount the SAME accordion, built here from ISSUE_MAP + ALIGN_CATEGORIES.
    // One source of truth = the two surfaces (and the Key Races chips) can't drift.
    function _alignCatIssues(catKey) {
      return Object.keys(ISSUE_MAP).filter(function(k) { return ISSUE_MAP[k].cat === catKey; });
    }

    // ── Documented-coverage engine ─────────────────────────────
    // How many politicians actually have a curated, sourced position on each
    // issue — drawn straight from ISSUE_STANCE_DATA (the very records that power
    // every politician's documented stances). This lets the picker show, BEFORE
    // a visitor commits to an issue, which specific issues have real data to
    // match on and how rich each one is, so they aren't choosing blind. Counts
    // are factual (one per documented record that carries that issueKey — at most
    // once per politician), so nothing here is fabricated. Memoized because the
    // underlying data is static for the session.
    var _alignCovCache = null;
    function _alignCoverage() {
      if (_alignCovCache) return _alignCovCache;
      var byIssue = {}, byCat = {};
      try {
        if (typeof ISSUE_STANCE_DATA !== 'undefined' && ISSUE_STANCE_DATA) {
          Object.keys(ISSUE_STANCE_DATA).forEach(function(pid) {
            var list = ISSUE_STANCE_DATA[pid];
            if (!Array.isArray(list)) return;
            var seen = {}; // an issue counts at most once per politician record
            list.forEach(function(s) {
              var k = s && s.issueKey;
              if (!k || !ISSUE_MAP[k] || seen[k]) return;
              seen[k] = 1;
              byIssue[k] = (byIssue[k] || 0) + 1;
            });
          });
        }
      } catch (e) {}
      // Roll the per-issue counts up to their parent topic (category).
      Object.keys(byIssue).forEach(function(k) {
        var cat = ISSUE_MAP[k] && ISSUE_MAP[k].cat;
        if (!cat) return;
        if (!byCat[cat]) byCat[cat] = { issues: 0, positions: 0 };
        byCat[cat].issues++;
        byCat[cat].positions += byIssue[k];
      });
      _alignCovCache = { byIssue: byIssue, byCat: byCat };
      return _alignCovCache;
    }
    window._alignCoverage = _alignCoverage;

    function _alignChipHtml(key) {
      var d = ISSUE_MAP[key];
      if (!d) return '';
      // A small teal 📍 coverage badge tells the visitor, at a glance, how many
      // politicians have a documented, sourced position on THIS exact issue — so
      // they can see which issues actually have data to match on before picking.
      // "—" marks issues with no documented position tagged yet (they still score
      // from each candidate's broader record); the colour change keeps it honest.
      var cov = _alignCoverage().byIssue[key] || 0;
      var covHtml = cov > 0
        ? '<span class="align-opt-cov" title="' + cov + ' politician' + (cov === 1 ? '' : 's') + ' on PolitiDex ' + (cov === 1 ? 'has a' : 'have a') + ' documented, sourced position on this exact issue — pick it to see who lines up with you">📍 ' + cov + '</span>'
        : '<span class="align-opt-cov is-none" title="No documented positions are tagged to this exact issue yet — picking it still matches candidates from their broader record, and it sharpens as positions are added">📍 —</span>';
      // No party (R/D) badge — the option reads as a policy position, and the
      // checkbox box on the left makes the multi-select nature obvious. Once an
      // option is checked, a 5-point stance row (Strongly Support → Strongly
      // Oppose) reveals itself, plus a live badge showing the chosen stance.
      return '<div class="align-opt-row" data-opt-row="' + key + '">' +
        '<button type="button" class="align-chip align-opt" data-align-issue="' + key + '"' +
          ' aria-pressed="false" onclick="alignToggle(this)">' +
          '<span class="align-opt-box" aria-hidden="true"></span>' +
          '<span class="align-opt-text">' + d.chip + '</span>' +
          '<span class="align-stance-badge" data-stance-badge="' + key + '" aria-hidden="true"></span>' +
          covHtml +
        '</button>' +
        '<div class="align-intensity" role="group" aria-label="What is your stance on this position?">' +
          '<span class="align-int-caption" aria-hidden="true">Your stance</span>' +
          '<button type="button" class="align-int-btn" data-int="strongly_support" title="I strongly support this — a top-priority position for me" onclick="alignSetIntensity(\'' + key + '\',\'strongly_support\')">💪 Strongly Support</button>' +
          '<button type="button" class="align-int-btn" data-int="support" title="I support this position" onclick="alignSetIntensity(\'' + key + '\',\'support\')">👍 Support</button>' +
          '<button type="button" class="align-int-btn" data-int="neutral" title="I feel neutral / mixed on this — it counts lightly" onclick="alignSetIntensity(\'' + key + '\',\'neutral\')">😐 Neutral</button>' +
          '<button type="button" class="align-int-btn" data-int="oppose" title="I oppose this position" onclick="alignSetIntensity(\'' + key + '\',\'oppose\')">👎 Oppose</button>' +
          '<button type="button" class="align-int-btn" data-int="strongly_oppose" title="I strongly oppose this position" onclick="alignSetIntensity(\'' + key + '\',\'strongly_oppose\')">✋ Strongly Oppose</button>' +
        '</div>' +
      '</div>';
    }

    function _alignCatBodyHtml(catKey) {
      // Every position in the topic is an independent checkbox — visitors can pick
      // as many as they agree with (including a balanced middle option), instead of
      // being forced into a single "this vs that" choice.
      var keys = _alignCatIssues(catKey);
      return '<div class="align-opt-list">' + keys.map(_alignChipHtml).join('') + '</div>';
    }

    function _alignBuildPicker() {
      var lastGroup = null;
      var cov = _alignCoverage();
      return ALIGN_CATEGORIES.map(function(c) {
        var groupHtml = '';
        if (c.group && c.group !== lastGroup) {
          lastGroup = c.group;
          groupHtml = '<div class="align-group-divider">' + c.group + '</div>';
        }
        // Static topic-level coverage: how many documented positions across the
        // field this topic offers to match on. Surfaces the richest topics at a
        // glance so a visitor knows where the data is deepest.
        var cc = cov.byCat[c.key];
        var covCatHtml = (cc && cc.positions > 0)
          ? '<span class="align-cat-cov" title="' + cc.positions + ' documented position' + (cc.positions === 1 ? '' : 's') + ' from politicians across this topic, covering ' + cc.issues + ' issue' + (cc.issues === 1 ? '' : 's') + ' — these are ready to match on">📍 ' + cc.positions + '</span>'
          : '';
        return groupHtml +
          '<div class="align-cat" data-cat="' + c.key + '">' +
          '<button type="button" class="align-cat-head" onclick="alignToggleCat(this)" aria-expanded="false">' +
            '<span class="align-cat-title"><span class="align-cat-ico">' + c.icon + '</span>' + c.label + '</span>' +
            '<span class="align-cat-meta">' +
              covCatHtml +
              '<span class="align-cat-badge" data-cat-badge="' + c.key + '" style="display:none;">0</span>' +
              '<span class="align-cat-chev">▾</span>' +
            '</span>' +
          '</button>' +
          '<div class="align-cat-body"><div class="align-cat-body-inner">' + _alignCatBodyHtml(c.key) + '</div></div>' +
        '</div>';
      }).join('');
    }

    // Reflect the live selection onto every chip + per-category count badge across
    // BOTH panels at once, so a change made on one surface shows on the other.
    function _alignSyncAllChips() {
      document.querySelectorAll('.align-chip[data-align-issue]').forEach(function(chip) {
        var k = chip.getAttribute('data-align-issue');
        var on = _alignIssues.has(k);
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        // Reflect the per-issue stance onto the row: highlight the chosen level,
        // flag oppose/strongly_oppose (which re-skins the checkbox to a red ✕), and
        // fill the live stance badge. A bare selection implies the default 'support'.
        var row = chip.closest('.align-opt-row');
        if (row) {
          var lvl = on ? _alignMigrateLevel(_alignIntensity[k] || ALIGN_DEFAULT_LEVEL) : null;
          ALIGN_LEVELS.forEach(function(L) { row.classList.remove('lvl-' + L); });
          row.classList.remove('opposed');
          if (lvl) {
            row.classList.add('lvl-' + lvl);
            if (lvl === 'oppose' || lvl === 'strongly_oppose') row.classList.add('opposed');
          }
          row.querySelectorAll('.align-int-btn').forEach(function(b) {
            b.classList.toggle('sel', !!lvl && b.getAttribute('data-int') === lvl);
          });
          var badge = row.querySelector('[data-stance-badge]');
          if (badge) {
            if (lvl) {
              var meta = _alignLevelMeta(lvl);
              badge.textContent = meta.icon + ' ' + meta.label;
              badge.style.display = 'inline-flex';
            } else {
              badge.textContent = '';
              badge.style.display = 'none';
            }
          }
        }
      });
      var counts = {};
      _alignIssues.forEach(function(k) {
        var d = ISSUE_MAP[k];
        if (d && d.cat) counts[d.cat] = (counts[d.cat] || 0) + 1;
      });
      document.querySelectorAll('.align-cat-badge[data-cat-badge]').forEach(function(b) {
        var c = b.getAttribute('data-cat-badge');
        var n = counts[c] || 0;
        var prev = b.textContent;
        b.textContent = n;
        b.style.display = n > 0 ? 'inline-flex' : 'none';
        // Little pop whenever a category's count actually changes — satisfying, cheap.
        if (n > 0 && String(n) !== prev) {
          b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        }
      });
      _alignUpdateToolbar();
    }

    // Live "N positions selected" count shown in each picker's control bar. Pops
    // briefly whenever the total actually changes so the toolbar feels responsive.
    function _alignUpdateToolbar() {
      var n = _alignIssues.size;
      document.querySelectorAll('.align-sel-count').forEach(function(el) {
        var prev = el.getAttribute('data-n');
        el.innerHTML = (n === 0)
          ? 'No positions selected yet'
          : '<b>' + n + '</b> position' + (n > 1 ? 's' : '') + ' selected';
        if (String(n) !== prev) {
          el.setAttribute('data-n', String(n));
          if (n > 0) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        }
      });
      // Keep the compact (collapsed) card's status line and CTA in sync with picks.
      var cs = document.getElementById('align-compact-status');
      if (cs) {
        cs.innerHTML = (n === 0)
          ? 'No positions selected yet'
          : "You've aligned on <b>" + n + "</b> issue" + (n > 1 ? 's' : '');
      }
      var cbl = document.getElementById('align-compact-btn-label');
      if (cbl) cbl.textContent = (n === 0) ? 'Start Matching Politicians' : 'Adjust My Alignment';
      // Once the visitor has picks, reframe the tagline around acting on the results
      // and reveal the forward actions that jump to their best-match candidates.
      var ct = document.getElementById('align-compact-tagline');
      if (ct) ct.textContent = (n === 0)
        ? 'Pick the issues you care about, then compare the candidates running in your district and add your best matches to your team.'
        : 'Your Match % now shows on every candidate — see who fits you best and add your top picks to your team.';
      var cm = document.getElementById('align-compact-matches');
      if (cm) cm.style.display = (n === 0) ? 'none' : 'inline-flex';
      var dn = document.getElementById('align-done-btn');
      if (dn) dn.style.display = (n === 0) ? 'none' : 'inline-flex';
    }

    // Personalized Alignment Tool: a compact-by-default feature card that expands
    // to the full picker on demand. Pass true/false to force a state, or call with
    // no argument to flip it. Toggling only swaps CSS classes — every picker, the
    // search, and the match maths keep working untouched in the DOM.
    window.alignTogglePanel = function(forceState) {
      var panel = document.getElementById('alignment-panel');
      if (!panel) return;
      var willOpen = (forceState === true) ? true
                   : (forceState === false) ? false
                   : panel.classList.contains('align-collapsed');
      panel.classList.toggle('align-collapsed', !willOpen);
      panel.classList.toggle('align-expanded', willOpen);
      var head = panel.querySelector('.align-head-main');
      if (head) head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };

    // Closes the loop from "I picked my issues" to "show me who to add." Collapses
    // the tool, re-asserts the alignment-aware "Best Match for You" browse sort, and
    // scrolls the visitor straight to the candidate list so their alignment turns
    // directly into team-building decisions. Used by both the compact card's
    // "See My Best Matches" button and the open tool's "Done" action.
    window.alignSeeMatches = function() {
      var hasPicks = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      if (window.alignTogglePanel) window.alignTogglePanel(false);
      if (hasPicks) {
        // Let the auto-default kick back in so the strongest matches lead the list.
        window._myteamBrowseSortAuto = true;
        if (typeof myteamBrowseFilter === 'function') myteamBrowseFilter();
      }
      var target = document.getElementById('browse-toolbar') || document.getElementById('myteam-browse-grid');
      if (target) {
        setTimeout(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.add('align-flash');
          setTimeout(function() { target.classList.remove('align-flash'); }, 1200);
        }, 140);
      }
    };

    function _alignRenderPickers() {
      var html = _alignBuildPicker();
      ['align-cats-main', 'align-cats-rel'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
      });
      _alignSyncAllChips();
      // Auto-expand any category that already has a selected issue so returning
      // visitors immediately see what's driving their score; the rest stay tidy.
      document.querySelectorAll('.align-cat').forEach(function(cat) {
        if (cat.querySelector('.align-chip.active')) {
          cat.classList.add('open');
          var head = cat.querySelector('.align-cat-head');
          if (head) head.setAttribute('aria-expanded', 'true');
        }
      });
    }

    window.alignToggleCat = function(btn) {
      var cat = btn.closest('.align-cat');
      if (!cat) return;
      var open = cat.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    // Open or close every topic in a given picker at once. Scoped by the cats
    // container id so the main tool and the "My Key Alignments" panel act
    // independently; hidden (search-filtered) categories are left untouched.
    window.alignExpandAll = function(catsId) {
      var cats = document.getElementById(catsId || 'align-cats-main');
      if (!cats) return;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        if (cat.classList.contains('align-hide')) return;
        cat.classList.add('open');
        var h = cat.querySelector('.align-cat-head');
        if (h) h.setAttribute('aria-expanded', 'true');
      });
    };

    window.alignCollapseAll = function(catsId) {
      var cats = document.getElementById(catsId || 'align-cats-main');
      if (!cats) return;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        cat.classList.remove('open');
        var h = cat.querySelector('.align-cat-head');
        if (h) h.setAttribute('aria-expanded', 'false');
      });
    };

    // Keep only stance entries that point at a currently-selected, known issue and
    // carry a real non-default level, so the overlay can never go stale. Legacy
    // 3-state values are migrated in place; 'support' (the default) is dropped.
    function _alignCleanIntensity() {
      Object.keys(_alignIntensity).forEach(function(k) {
        var lvl = _alignMigrateLevel(_alignIntensity[k]);
        if (!ISSUE_MAP[k] || !_alignIssues.has(k) || ALIGN_LEVELS.indexOf(lvl) === -1 || lvl === ALIGN_DEFAULT_LEVEL) {
          delete _alignIntensity[k];
        } else {
          _alignIntensity[k] = lvl;
        }
      });
    }

    function _alignSanitizeIntensity(obj) {
      var clean = {};
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(function(k) {
          var lvl = _alignMigrateLevel(obj[k]);
          if (ISSUE_MAP[k] && _alignIssues.has(k) && ALIGN_LEVELS.indexOf(lvl) !== -1 && lvl !== ALIGN_DEFAULT_LEVEL) clean[k] = lvl;
        });
      }
      return clean;
    }

    function _alignLoad() {
      try {
        var saved = localStorage.getItem(ALIGN_KEY);
        if (saved) {
          var arr = JSON.parse(saved);
          // Keep only issues that still exist in ISSUE_MAP so a stale key from a
          // previous issue set can't leave the UI in a "scored but empty" state.
          var keep = (Array.isArray(arr) ? arr : []).filter(function(k) { return !!ISSUE_MAP[k]; });
          _alignIssues = new Set(keep);
        }
      } catch(e) {}
      // Intensity loads after the selection so it can be intersected with it.
      try {
        var si = localStorage.getItem(ALIGN_INT_KEY);
        if (si) { _alignIntensity = _alignSanitizeIntensity(JSON.parse(si)); _alignExposeIntensity(); }
      } catch(e) {}
    }

    function _alignSave() {
      _alignCleanIntensity();
      try { localStorage.setItem(ALIGN_KEY, JSON.stringify([..._alignIssues])); } catch(e) {}
      try { localStorage.setItem(ALIGN_INT_KEY, JSON.stringify(_alignIntensity)); } catch(e) {}
      // Mirror the selection to the signed-in member's profile so their Alignment
      // Signature persists across sessions and devices (no-op when logged out).
      _alignSaveToFirestore();
    }

    // ── Alignment Signature: per-user Firestore persistence ────────────
    // Logged-in members get their issue/POV picks saved to their user document
    // (users/{uid}.alignmentPreferences) so the tool — and every politician
    // card's match % — reloads exactly as they left it on any device. Logged-out
    // (or anonymous) visitors keep using localStorage only; nothing is written.
    var ALIGN_FS_FIELD = 'alignmentPreferences';
    var ALIGN_FS_INT_FIELD = 'alignmentIntensity';
    var _alignFsSaveTimer = null;

    function _alignCurrentUser() {
      try {
        if (typeof auth === 'undefined' || !auth) return null;
        var u = auth.currentUser;
        return (u && !u.isAnonymous) ? u : null;
      } catch(e) { return null; }
    }

    // Debounced background write — coalesces rapid chip toggles into one network
    // round-trip and never blocks the UI.
    function _alignSaveToFirestore() {
      var user = _alignCurrentUser();
      if (!user) return;
      if (_alignFsSaveTimer) clearTimeout(_alignFsSaveTimer);
      _alignFsSaveTimer = setTimeout(function() {
        _alignFsSaveTimer = null;
        var current = _alignCurrentUser();
        if (!current) return;
        try {
          _alignCleanIntensity();
          var payload = {};
          payload[ALIGN_FS_FIELD] = [..._alignIssues];
          payload[ALIGN_FS_INT_FIELD] = _alignIntensity;
          payload[ALIGN_FS_FIELD + '_updated'] = firebase.firestore.FieldValue.serverTimestamp();
          db.collection('users').doc(current.uid).set(payload, { merge: true })
            .catch(function(e) { console.warn('Alignment save to Firestore failed:', e); });
        } catch(e) { console.warn('Alignment save to Firestore failed:', e); }
      }, 600);
    }

    // Active real-time subscription to the signed-in member's user document.
    var _alignFsUnsub = null;   // onSnapshot unsubscribe handle (null when none)
    var _alignFsUid = null;     // uid currently being streamed
    var _alignSeededUid = null; // uid whose empty signature we've already seeded

    // Make a saved-preferences array the authoritative selection. Returns true
    // only when it actually changes the current picks, so callers repaint cards
    // just once and our own Firestore write echoing back through the listener is
    // a no-op (no repaint loop). Mutates _alignIssues in place so
    // window._alignIssues (shared with the Key Races quick-adjust) keeps pointing
    // at the same live Set.
    function _alignApplySaved(saved) {
      if (!Array.isArray(saved)) return false;
      var keep = saved.filter(function(k) { return !!ISSUE_MAP[k]; });
      var same = (keep.length === _alignIssues.size) && keep.every(function(k) { return _alignIssues.has(k); });
      if (same) return false;
      _alignIssues.clear();
      keep.forEach(function(k) { _alignIssues.add(k); });
      window._alignIssues = _alignIssues;
      try { localStorage.setItem(ALIGN_KEY, JSON.stringify([..._alignIssues])); } catch(e) {}
      return true;
    }

    // Mirror of _alignApplySaved for the intensity overlay. Sanitizes against the
    // current selection (so a level can't apply to an unselected issue) and only
    // reports a change when it actually differs, keeping the Firestore echo a no-op.
    function _alignApplyIntensity(saved) {
      var clean = _alignSanitizeIntensity(saved);
      var aK = Object.keys(clean).sort();
      var bK = Object.keys(_alignIntensity).sort();
      var same = aK.length === bK.length && aK.every(function(k, i) { return k === bK[i] && clean[k] === _alignIntensity[bK[i]]; });
      if (same) return false;
      _alignIntensity = clean;
      _alignExposeIntensity();
      try { localStorage.setItem(ALIGN_INT_KEY, JSON.stringify(_alignIntensity)); } catch(e) {}
      return true;
    }

    function _alignStopFirestoreListener() {
      if (_alignFsUnsub) { try { _alignFsUnsub(); } catch(e) {} }
      _alignFsUnsub = null;
      _alignFsUid = null;
    }

    // Stream the signed-in member's saved Alignment Signature and make it the live
    // source of truth for every politician card's match %. Using a real-time
    // onSnapshot listener (one lightweight per-user document, not polling) means
    // the saved choices stay authoritative: change them on another device or tab
    // and the cards here refresh automatically. If the member has no signature
    // yet, seed it once from whatever they picked locally before signing in so
    // pre-login selections are not lost. An empty saved array is respected as an
    // intentional "cleared" state rather than re-seeded.
    function _alignLoadFromFirestore(uid) {
      if (!uid) return;
      if (_alignFsUid === uid && _alignFsUnsub) return; // already streaming this user
      _alignStopFirestoreListener();
      _alignFsUid = uid;
      _alignFsUnsub = db.collection('users').doc(uid).onSnapshot(function(doc) {
        var data = (doc.exists && doc.data()) ? doc.data() : null;
        var saved = data ? data[ALIGN_FS_FIELD] : null;
        var savedInt = data ? data[ALIGN_FS_INT_FIELD] : null;
        if (Array.isArray(saved)) {
          _alignSeededUid = uid;
          // Apply the selection first, then the intensity overlay (which is
          // intersected against that selection). Repaint once if either changed.
          var c1 = _alignApplySaved(saved);
          var c2 = _alignApplyIntensity(savedInt);
          if (c1 || c2) _alignRefreshAll();
        } else if (_alignSeededUid !== uid && _alignIssues.size > 0) {
          // Brand-new signature → persist the visitor's current local picks (and
          // their intensity overlay) once, rather than wiping them.
          _alignSeededUid = uid;
          _alignSaveToFirestore();
        }
        _alignUpdateSigninPrompt();
      }, function(e) {
        console.warn('Alignment load from Firestore failed:', e);
        _alignUpdateSigninPrompt();
      });
    }
    window._alignLoadFromFirestore = _alignLoadFromFirestore;

    // Swap the save-status note between "sign in to save" and "saved to account".
    function _alignUpdateSigninPrompt() {
      var el = document.getElementById('align-signature-status');
      if (!el) return;
      if (_alignCurrentUser()) {
        el.className = 'align-future-note align-sig-saved';
        el.innerHTML = '<span class="align-future-ico">✅</span>' +
          '<span>Your <strong>Alignment Signature</strong> is saved to your account — your picks follow you across devices and load automatically every time you sign in.</span>';
      } else {
        el.className = 'align-future-note align-sig-signin';
        el.innerHTML = '<span class="align-future-ico">💾</span>' +
          '<span><strong>Sign in to save your Alignment Signature.</strong> Your selected positions will follow you across devices and reload automatically next time.' +
          '<button type="button" class="align-sig-btn" onclick="(window.openAuthModal||function(){})()">Sign in</button></span>';
      }
      // Keep the team-builder alignment prompt's save-state note (saved vs sign-in)
      // in step with auth, since this runs on every sign-in / sign-out.
      if (typeof window._myteamRenderAlignPrompt === 'function') window._myteamRenderAlignPrompt();
    }
    window._alignUpdateSigninPrompt = _alignUpdateSigninPrompt;

    // React to auth changes. Firebase supports multiple listeners, so adding our
    // own leaves the existing login/sync flow untouched. The listener also fires
    // immediately with the current state on registration, covering the case where
    // auth resolved before this tool initialized.
    function _alignBindAuth() {
      try {
        if (typeof auth === 'undefined' || !auth || !auth.onAuthStateChanged) return;
        auth.onAuthStateChanged(function(user) {
          if (user && !user.isAnonymous) {
            _alignLoadFromFirestore(user.uid);
          } else {
            // Signed out → stop streaming the previous member's signature and fall
            // back to localStorage-only behaviour.
            _alignStopFirestoreListener();
            _alignSeededUid = null;
            _alignUpdateSigninPrompt();
          }
        });
      } catch(e) {}
    }

    // Directional nudge for positions that carry an internal lean. It pulls the
    // per-position match gently toward candidates whose record matches the position
    // and away from the opposite, but the candidate's own record (already baked into
    // `score`) stays the dominant factor — so the tool reads on policy substance, not
    // party. The pull is deliberately light (record weighted 0.78) and balanced
    // options carry no lean at all, so they score purely on the candidate's record.
    function _alignApplyLean(score, lean, d) {
      var party = (d && d.party ? String(d.party) : '').toUpperCase().charAt(0);
      if (party !== 'R' && party !== 'D') return score;
      var target = (party === lean) ? 80 : 38;
      return score * 0.78 + target * 0.22;
    }

    // ── Accountability as a matching signal ───────────────────────────────────
    // The Accountability of Truth Score is a personal-integrity / consistency read
    // (does their record back up their word?). It is deliberately SEPARATE from the
    // issue-alignment math below, but it should still move "Best Match for You" — a
    // candidate who lines up on the issues AND has a strong accountability pattern
    // is a better match than one who lines up but has a concerning one. We fold it
    // in as a small, bounded, transparent nudge so it complements Promise % and
    // issue alignment without ever dominating them.
    //
    //   • Centered on a neutral midpoint (50): a middling record neither rewards
    //     nor penalizes. Strong records (>50) lift the match; weak/concerning ones
    //     (<50) lower it.
    //   • Capped at ±(50 · WEIGHT) points — with WEIGHT = 0.2 that is ≤±10, so the
    //     issue-by-issue fit always leads.
    //   • Thin data is treated as NEUTRAL, not negative: when there isn't enough
    //     verified record to score a politician honestly (_pdxScoreExplainable is
    //     false, or the engine can't produce a number), _acctMatchScore returns
    //     null and the match is left exactly as the issue alignment computed it.
    var ACCT_MATCH_WEIGHT = 0.2;   // max ±10-pt swing on the final match %
    var ACCT_MATCH_NEUTRAL = 50;   // the score that neither helps nor hurts

    // The numeric Accountability of Truth Score for matching/sorting (0–100), or
    // null when the record is too thin to score fairly (→ treated as neutral).
    // Memoized per pid: this is read in sort comparators and on every card, and the
    // underlying curated record is stable within a session. _acctMatchCacheBust()
    // clears it if scores are (re)computed elsewhere.
    var _acctMatchCache = {};
    window._acctMatchCacheBust = function (pid) { if (pid) delete _acctMatchCache[pid]; else _acctMatchCache = {}; };
    function _acctMatchScore(pid) {
      if (Object.prototype.hasOwnProperty.call(_acctMatchCache, pid)) return _acctMatchCache[pid];
      var p = (typeof getProfile === 'function') ? (getProfile(pid) || null) : null;
      if (!p && typeof CMP_DATA !== 'undefined') p = CMP_DATA[pid] || null;
      if (!p) { _acctMatchCache[pid] = null; return null; }
      // Never score a record we couldn't honestly explain on the profile itself —
      // this is the same honesty gate the Accountability chip/modal already use, so
      // thin profiles stay neutral here instead of being silently penalized.
      if (typeof window._pdxScoreExplainable === 'function' && !window._pdxScoreExplainable(p, pid)) { _acctMatchCache[pid] = null; return null; }
      var a = p.accountability;
      if (!(a && typeof a.overallScore === 'number') && typeof window._acctEnsureScore === 'function') {
        try { a = window._acctEnsureScore(pid, p); } catch (e) { a = null; }
      }
      var out = (a && typeof a.overallScore === 'number') ? a.overallScore : null;
      _acctMatchCache[pid] = out;
      return out;
    }
    window._acctMatchScore = _acctMatchScore;

    // Fold the Accountability Score into a raw issue-alignment value, returning the
    // detail (so callers can both use the adjusted number AND explain the nudge).
    function _acctMatchInfo(pid, base) {
      var acct = _acctMatchScore(pid);
      if (base === null || base === undefined) return { base: base, acct: acct, delta: 0, adjusted: base };
      if (acct === null) return { base: Math.round(base), acct: null, delta: 0, adjusted: Math.round(base) };
      var raw = base + (acct - ACCT_MATCH_NEUTRAL) * ACCT_MATCH_WEIGHT;
      var adjusted = Math.round(Math.min(100, Math.max(0, raw)));
      return { base: Math.round(base), acct: acct, delta: adjusted - Math.round(base), adjusted: adjusted };
    }
    window._acctMatchInfo = _acctMatchInfo;

    // Convenience: just the accountability-adjusted match %.
    function _applyAcctToMatch(pid, base) { return _acctMatchInfo(pid, base).adjusted; }
    window._applyAcctToMatch = _applyAcctToMatch;

    function _calcAlignmentScore(pid) {
      if (_alignIssues.size === 0) return null;
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;

      var profile = (typeof PROFILES !== 'undefined') ? PROFILES[pid] : null;

      // The candidate's curated, sourced issue positions, keyed one-to-one to the
      // same ISSUE_MAP keys the picker uses. These are the most authoritative signal
      // we have — an explicit, documented "supports / opposes / mixed" on the exact
      // issue — so when a selected issue matches one, it drives the score directly
      // instead of being inferred from keyword overlap. This is what makes a thin
      // candidate (stated positions only, no voting record) genuinely scorable.
      var polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};

      var totalWeight = 0;
      var totalScore = 0;

      _alignIssues.forEach(function(issueKey) {
        var issueDef = ISSUE_MAP[issueKey];
        if (!issueDef) return;

        var relevance = 0;
        var polIssuesLower = (d.issues || []).map(function(i) { return i.toLowerCase(); });

        if (profile && profile.keyIssues) {
          profile.keyIssues.forEach(function(ki) {
            var kiLow = ki.toLowerCase();
            issueDef.keywords.forEach(function(kw) {
              if (kiLow.indexOf(kw.toLowerCase()) !== -1) relevance += 3;
            });
          });
        }

        issueDef.keywords.forEach(function(kw) {
          polIssuesLower.forEach(function(pi) {
            if (pi.indexOf(kw.toLowerCase()) !== -1) relevance += 2;
          });
        });

        var stanceScore = 0;
        var stanceCount = 0;
        if (d.stances) {
          issueDef.stanceKeys.forEach(function(sk) {
            var stance = d.stances[sk];
            if (!stance || stance === 'N/A' || stance === '—' || /^N\/A/i.test(stance)) return;
            stanceCount++;
            if (stance.indexOf('❌') !== -1) stanceScore += 0.2;
            else if (stance.indexOf('🔥') !== -1) stanceScore += 0.4;
            else if (/support|pledged|co-sponsor|100%|authored|champion|passed|expand/i.test(stance)) stanceScore += 1.0;
            else if (/oppose|voted no|against|skeptic/i.test(stance)) stanceScore += 0.7;
            else stanceScore += 0.5;
          });
        }

        var votingBonus = 0;
        var votingCount = 0;
        if (profile && profile.sections) {
          profile.sections.forEach(function(sec) {
            if (sec.type === 'voting_record' && sec.votes) {
              sec.votes.forEach(function(v) {
                var billLow = (v.bill || '').toLowerCase();
                var matterLow = (v.matter || '').toLowerCase();
                var text = billLow + ' ' + matterLow;
                var matches = issueDef.keywords.some(function(kw) { return text.indexOf(kw.toLowerCase()) !== -1; });
                if (matches) {
                  votingCount++;
                  if (v.alignment === 'kept') votingBonus += 1.0;
                  else if (v.alignment === 'partial') votingBonus += 0.6;
                  else if (v.alignment === 'broken') votingBonus += 0.15;
                  else votingBonus += 0.5;
                }
              });
            }
          });
        }

        var promiseBonus = 0;
        var promiseCount = 0;
        if (profile && profile.promises) {
          profile.promises.forEach(function(pr) {
            var prText = ((pr.title || '') + ' ' + (pr.detail || '')).toLowerCase();
            var matches = issueDef.keywords.some(function(kw) { return prText.indexOf(kw.toLowerCase()) !== -1; });
            if (matches) {
              promiseCount++;
              if (pr.verdict === 'kept') promiseBonus += 1.0;
              else if (pr.verdict === 'partial') promiseBonus += 0.5;
              else if (pr.verdict === 'pending') promiseBonus += 0.4;
              else if (pr.verdict === 'broken') promiseBonus += 0.1;
            }
          });
        }

        var issueWeight = 1;
        if (relevance > 0) issueWeight += Math.min(relevance, 8) * 0.4;
        if (stanceCount > 0) issueWeight += 1;
        if (votingCount > 0) issueWeight += 0.8;
        if (promiseCount > 0) issueWeight += 0.6;

        var baseScore = d.score;
        if (baseScore === null || baseScore === undefined) baseScore = 50;

        var issueScore = baseScore;
        if (stanceCount > 0) {
          var avgStance = stanceScore / stanceCount;
          issueScore = baseScore * 0.45 + avgStance * 50 * 0.55;
        }
        if (votingCount > 0) {
          var avgVoting = votingBonus / votingCount;
          issueScore = issueScore * 0.7 + avgVoting * 100 * 0.3;
        }
        if (promiseCount > 0) {
          var avgPromise = promiseBonus / promiseCount;
          issueScore = issueScore * 0.8 + avgPromise * 100 * 0.2;
        }
        if (relevance > 0) {
          issueScore = issueScore * (1 + Math.min(relevance, 10) * 0.025);
        }

        var _userIntensity = _alignMigrateLevel(_alignIntensity[issueKey] || ALIGN_DEFAULT_LEVEL);
        var _model = _alignLevelModel(_userIntensity);
        var directPos = polMap[issueKey] || null;

        if (directPos) {
          // The candidate has a documented position on this exact issue — the most
          // authoritative signal there is. Score it straight from that stance vs. the
          // visitor's own view (_issueVerdict already folds oppose/neutral picks into
          // the verdict), and give documented positions strong weight so they lead the
          // match. The stance level then scales the weight (stronger = heavier); we do
          // NOT additionally invert here because the verdict already accounts for it.
          var _verdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, directPos.stance) : 'partial';
          issueScore = _verdict === 'match' ? 90 : _verdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight;
        } else {
          if (issueDef.lean) {
            issueScore = _alignApplyLean(issueScore, issueDef.lean, d);
          }
          issueScore = Math.min(100, Math.max(0, issueScore));
          // Apply the 5-point stance model. The default 'support' (weight 1.0, no
          // inversion) leaves the score and weight untouched, so signatures saved
          // before this feature score identically. oppose/strongly_oppose invert the
          // match (a candidate who holds the position now scores LOW for this voter);
          // neutral pulls the score toward the midpoint and counts lightly; stronger
          // levels weight the issue more heavily.
          if (_model.agree === false) { issueScore = 100 - issueScore; }
          else if (_model.agree === null) { issueScore = issueScore * 0.35 + 50 * 0.65; }
          issueWeight *= _model.weight;
        }

        totalWeight += issueWeight;
        totalScore += issueScore * issueWeight;
      });

      if (totalWeight === 0) return null;
      // Fold in the Accountability Score as a small, bounded nudge (neutral when
      // the record is too thin to score) so strong/weak integrity patterns move the
      // match without overriding the issue-by-issue fit.
      return _applyAcctToMatch(pid, totalScore / totalWeight);
    }

    // Per-issue version of the alignment score — same math, but it records each
    // selected issue's contribution so the Align quick-view can show a breakdown.
    function _calcAlignmentBreakdown(pid) {
      if (_alignIssues.size === 0) return null;
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;
      var profile = (typeof PROFILES !== 'undefined') ? PROFILES[pid] : null;

      // Same authoritative curated positions used by _calcAlignmentScore (kept in
      // lock-step), so the breakdown's per-issue scores and the headline % agree.
      var polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};

      var totalWeight = 0, totalScore = 0;
      var perIssue = [];

      _alignIssues.forEach(function(issueKey) {
        var issueDef = ISSUE_MAP[issueKey];
        if (!issueDef) return;

        var relevance = 0;
        var polIssuesLower = (d.issues || []).map(function(i) { return i.toLowerCase(); });

        if (profile && profile.keyIssues) {
          profile.keyIssues.forEach(function(ki) {
            var kiLow = ki.toLowerCase();
            issueDef.keywords.forEach(function(kw) {
              if (kiLow.indexOf(kw.toLowerCase()) !== -1) relevance += 3;
            });
          });
        }
        issueDef.keywords.forEach(function(kw) {
          polIssuesLower.forEach(function(pi) {
            if (pi.indexOf(kw.toLowerCase()) !== -1) relevance += 2;
          });
        });

        var stanceScore = 0, stanceCount = 0;
        if (d.stances) {
          issueDef.stanceKeys.forEach(function(sk) {
            var stance = d.stances[sk];
            if (!stance || stance === 'N/A' || stance === '—' || /^N\/A/i.test(stance)) return;
            stanceCount++;
            if (stance.indexOf('❌') !== -1) stanceScore += 0.2;
            else if (stance.indexOf('🔥') !== -1) stanceScore += 0.4;
            else if (/support|pledged|co-sponsor|100%|authored|champion|passed|expand/i.test(stance)) stanceScore += 1.0;
            else if (/oppose|voted no|against|skeptic/i.test(stance)) stanceScore += 0.7;
            else stanceScore += 0.5;
          });
        }

        var votingBonus = 0, votingCount = 0;
        if (profile && profile.sections) {
          profile.sections.forEach(function(sec) {
            if (sec.type === 'voting_record' && sec.votes) {
              sec.votes.forEach(function(v) {
                var text = (v.bill || '').toLowerCase() + ' ' + (v.matter || '').toLowerCase();
                var matches = issueDef.keywords.some(function(kw) { return text.indexOf(kw.toLowerCase()) !== -1; });
                if (matches) {
                  votingCount++;
                  if (v.alignment === 'kept') votingBonus += 1.0;
                  else if (v.alignment === 'partial') votingBonus += 0.6;
                  else if (v.alignment === 'broken') votingBonus += 0.15;
                  else votingBonus += 0.5;
                }
              });
            }
          });
        }

        var promiseBonus = 0, promiseCount = 0;
        if (profile && profile.promises) {
          profile.promises.forEach(function(pr) {
            var prText = ((pr.title || '') + ' ' + (pr.detail || '')).toLowerCase();
            var matches = issueDef.keywords.some(function(kw) { return prText.indexOf(kw.toLowerCase()) !== -1; });
            if (matches) {
              promiseCount++;
              if (pr.verdict === 'kept') promiseBonus += 1.0;
              else if (pr.verdict === 'partial') promiseBonus += 0.5;
              else if (pr.verdict === 'pending') promiseBonus += 0.4;
              else if (pr.verdict === 'broken') promiseBonus += 0.1;
            }
          });
        }

        var issueWeight = 1;
        if (relevance > 0) issueWeight += Math.min(relevance, 8) * 0.4;
        if (stanceCount > 0) issueWeight += 1;
        if (votingCount > 0) issueWeight += 0.8;
        if (promiseCount > 0) issueWeight += 0.6;

        var baseScore = d.score;
        if (baseScore === null || baseScore === undefined) baseScore = 50;

        var issueScore = baseScore;
        if (stanceCount > 0) {
          var avgStance = stanceScore / stanceCount;
          issueScore = baseScore * 0.45 + avgStance * 50 * 0.55;
        }
        if (votingCount > 0) {
          var avgVoting = votingBonus / votingCount;
          issueScore = issueScore * 0.7 + avgVoting * 100 * 0.3;
        }
        if (promiseCount > 0) {
          var avgPromise = promiseBonus / promiseCount;
          issueScore = issueScore * 0.8 + avgPromise * 100 * 0.2;
        }
        if (relevance > 0) {
          issueScore = issueScore * (1 + Math.min(relevance, 10) * 0.025);
        }

        var _userIntensity = _alignMigrateLevel(_alignIntensity[issueKey] || ALIGN_DEFAULT_LEVEL);
        var _model = _alignLevelModel(_userIntensity);
        var directPos = polMap[issueKey] || null;
        var _verdict = null;

        if (directPos) {
          // Authoritative documented position — score straight from the stance vs.
          // the visitor's view (see _calcAlignmentScore for the rationale).
          _verdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, directPos.stance) : 'partial';
          issueScore = _verdict === 'match' ? 90 : _verdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight;
        } else {
          if (issueDef.lean) {
            issueScore = _alignApplyLean(issueScore, issueDef.lean, d);
          }
          issueScore = Math.min(100, Math.max(0, issueScore));
          // Same 5-point stance model as _calcAlignmentScore (kept in lock-step).
          if (_model.agree === false) { issueScore = 100 - issueScore; }
          else if (_model.agree === null) { issueScore = issueScore * 0.35 + 50 * 0.65; }
          issueWeight *= _model.weight;
        }

        totalWeight += issueWeight;
        totalScore += issueScore * issueWeight;

        // `direct` flags a curated, documented position on this exact issue (the
        // strongest evidence); the UI uses it to label the row honestly and to lead
        // with documented matches. `hasEvidence` stays true for those too.
        var hasEvidence = (!!directPos || relevance > 0 || stanceCount > 0 || votingCount > 0 || promiseCount > 0);
        perIssue.push({ key: issueKey, label: issueDef.label, score: Math.round(issueScore), weight: issueWeight, hasEvidence: hasEvidence, direct: !!directPos, verdict: _verdict, stance: directPos ? directPos.stance : null, topic: directPos ? directPos.topic : null, text: directPos ? directPos.text : null, intensity: _userIntensity });
      });

      if (totalWeight === 0) return null;
      // Strongest-evidence issues first so the most meaningful matches lead.
      perIssue.sort(function(a, b) { return b.weight - a.weight; });
      // `issueOverall` is the pure issue-alignment fit; `overall` additionally folds
      // in the Accountability Score (kept in lock-step with _calcAlignmentScore) so
      // the headline % the UI shows matches the sort order. `acct`/`acctDelta` let
      // the quick-view explain how the integrity read moved the number.
      var _info = _acctMatchInfo(pid, totalScore / totalWeight);
      return { overall: _info.adjusted, issueOverall: _info.base, acct: _info.acct, acctDelta: _info.delta, issues: perIssue };
    }

    // Aggregate the whole 6-person team into a single alignment picture:
    //   • overall  — the team's average Your Match %
    //   • members  — each filled slot's name + match, sorted strongest first
    //   • issues   — every selected issue with the team's average score on it,
    //                sorted high→low, so we can surface what's driving the match
    //                and where the team falls short of the visitor's values.
    function _calcTeamAlignment(pids) {
      if (typeof _calcAlignmentBreakdown !== 'function') return null;
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return null;
      var members = [];
      var issueAgg = {};
      (pids || []).forEach(function(pid) {
        var bd = _calcAlignmentBreakdown(pid);
        var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
        if (!bd || !d) return;
        members.push({ pid: pid, name: d.name, score: bd.overall });
        bd.issues.forEach(function(it) {
          if (!issueAgg[it.key]) issueAgg[it.key] = { key: it.key, label: it.label, total: 0, count: 0 };
          issueAgg[it.key].total += it.score;
          issueAgg[it.key].count++;
        });
      });
      if (!members.length) return null;
      var overall = Math.round(members.reduce(function(s, m) { return s + m.score; }, 0) / members.length);
      var issues = Object.keys(issueAgg).map(function(k) {
        var a = issueAgg[k];
        return { key: k, label: a.label, score: Math.round(a.total / a.count) };
      });
      issues.sort(function(a, b) { return b.score - a.score; });
      members.sort(function(a, b) { return b.score - a.score; });
      return { overall: overall, members: members, issues: issues };
    }
    window._calcTeamAlignment = _calcTeamAlignment;

    // Rich "Team Alignment Overview" rendered into #myteam-alignment-bar. Gives the
    // visitor a plain-language read on how aligned their current team is, a per-member
    // breakdown, and — crucially — which of their selected issues are driving the
    // match up or dragging it down. Everything is tappable into the per-candidate
    // breakdown so the overview is a launch pad, not a dead end.
    function _renderTeamAlignOverview(ta) {
      if (!ta) return '';
      var col = _alignScoreColor(ta.overall);
      var word = ta.overall >= 70 ? 'strongly aligned' : ta.overall >= 50 ? 'partly aligned' : 'weakly aligned';
      var nIssues = ta.issues.length;

      var memberChips = ta.members.map(function(m) {
        var mc = _alignScoreColor(m.score);
        return '<button type="button" onclick="if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + m.pid + '\');" class="myteam-ao-chip" title="See ' + m.name + '’s issue-by-issue breakdown" style="border-color:' + mc + '55;">' +
            '<span class="myteam-ao-chip-name">' + m.name + '</span>' +
            '<span class="myteam-ao-chip-pct" style="color:' + mc + ';">' + m.score + '%</span>' +
          '</button>';
      }).join('');

      // Carry the saved team (ids + names) so each per-issue "See everyone's
      // evidence" jump can hand the Locker its highlight context — the My Team
      // counterpart to Compare's lineup carry. Read live by _myteamOpenIssueEvidence
      // on click, so it always reflects the team this overview was painted for.
      window._pdxTeamEvidenceCtx = {
        pols: ta.members.map(function(m) { return m.pid; }),
        names: ta.members.map(function(m) { return m.name; })
      };

      // Drivers: the issues the team scores best on (top, score ≥ 55) and the soft
      // spots where it lags (bottom, score < 50). Caps keep it scannable.
      var drivers = ta.issues.filter(function(i) { return i.score >= 55; }).slice(0, 3);
      var weak = ta.issues.filter(function(i) { return i.score < 50; }).slice(-2).reverse();
      var issueChip = function(i, kind) {
        var ic = _alignScoreColor(i.score);
        var inner = '<span class="myteam-ao-issue-lab">' + i.label + '</span>' +
            '<span class="myteam-ao-issue-pct" style="color:' + ic + ';">' + i.score + '%</span>';
        // Evidence jump — only when the issue has a tracked key AND there's evidence
        // on record for it (or the Locker library hasn't loaded yet, so we can't rule
        // it out). Opens the Evidence Locker filtered to this issue with the saved
        // team layered on as a highlight banner — reusing Compare's exact pattern
        // rather than forcing a multi-select politician filter. Gated so a tap never
        // lands on an empty file.
        var lockable = !!(i.key && typeof window._pdxOpenEvidenceLocker === 'function');
        if (lockable && typeof window._pdxEvidenceOnRecord === 'function') {
          var onRec = window._pdxEvidenceOnRecord([i.key]);   // null = library still loading
          if (onRec !== null && onRec.length === 0) lockable = false;
        }
        if (lockable) {
          var jk = String(i.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return '<button type="button" class="myteam-ao-issue myteam-ao-issue-ev ' + kind + '" ' +
              'style="border-color:' + ic + '4d;" ' +
              'onclick="window._myteamOpenIssueEvidence&&window._myteamOpenIssueEvidence(\'' + jk + '\');" ' +
              'title="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team is highlighted" ' +
              'aria-label="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team members are highlighted">' +
              inner + '<span class="myteam-ao-issue-ev-cue" aria-hidden="true">📂 ↗</span>' +
            '</button>';
        }
        return '<span class="myteam-ao-issue ' + kind + '" style="border-color:' + ic + '4d;">' + inner + '</span>';
      };
      var driversHtml = '';
      if (drivers.length) {
        driversHtml += '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#86efac;">▲ Driving your match</span>' +
          drivers.map(function(i) { return issueChip(i, 'good'); }).join('') + '</div>';
      }
      if (weak.length) {
        driversHtml += '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#fca5a5;">▼ Where your team falls short</span>' +
          weak.map(function(i) { return issueChip(i, 'bad'); }).join('') + '</div>';
      }
      if (!driversHtml) {
        driversHtml = '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#9fb4d4;">Across your ' + nIssues + ' selected issue' + (nIssues === 1 ? '' : 's') + '</span>' +
          ta.issues.slice(0, 3).map(function(i) { return issueChip(i, 'good'); }).join('') + '</div>';
      }

      return '<div class="myteam-ao-top">' +
          '<div class="myteam-ao-score" style="color:' + col + ';text-shadow:0 0 22px ' + col + '55;">' + ta.overall + '<span>%</span></div>' +
          '<div class="myteam-ao-head">' +
            '<div class="myteam-ao-title">🎯 Team Alignment Overview</div>' +
            '<div class="myteam-ao-sentence">Your team is <b style="color:' + col + ';">' + ta.overall + '% ' + word + '</b> with your values' +
              '<span class="myteam-ao-sub"> · averaged across ' + ta.members.length + ' pick' + (ta.members.length === 1 ? '' : 's') + ' &amp; your ' + nIssues + ' issue' + (nIssues === 1 ? '' : 's') + '</span></div>' +
            '<div class="myteam-ao-track"><span style="width:' + ta.overall + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="myteam-ao-members">' + memberChips + '</div>' +
        '<div class="myteam-ao-issues">' + driversHtml + '</div>' +
        '<div class="myteam-ao-foot">Tap a name for their issue-by-issue breakdown · ' +
          '<button type="button" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();">⚙ Adjust your issues</button></div>';
    }
    window._renderTeamAlignOverview = _renderTeamAlignOverview;

    // Jump from a Team Alignment issue chip into the Evidence Locker, filtered to
    // that issue with the saved team carried along as highlight context — the My
    // Team counterpart to Compare's _cmpOpenIssueEvidence. Reuses the same
    // comparePols / compareNames channel (the Locker single-selects politicians), so
    // the whole field still shows and the team rides along as a presentational banner
    // + card highlights rather than a forced multi-select filter. Reads the team
    // context the overview last painted, so it always matches what's on screen.
    window._myteamOpenIssueEvidence = function (issueKey) {
      if (!issueKey || typeof window._pdxOpenEvidenceLocker !== 'function') return;
      var ctx = window._pdxTeamEvidenceCtx || { pols: [], names: [] };
      window._pdxOpenEvidenceLocker({
        issue: issueKey,
        comparePols: (ctx.pols || []).slice(),
        compareNames: (ctx.names || []).slice(),
        compareLabel: 'your saved team members'
      });
    };

    // "My Team's Evidence" — the dashboard-level evidence launch pad rendered into
    // #myteam-evidence-bar, just below the Team Alignment Overview. Turns the saved
    // team into two first-class jumps into the Evidence Locker, both reusing the
    // patterns established in the My Team / Compare Phase 2 work:
    //   • a team-wide summary (total on-record items + a gold "Browse team
    //     evidence ↗" button) that opens the By-Politician lens pre-selected to
    //     every saved pick — via the new `pols` deep-link on _pdxOpenEvidenceLocker.
    //   • per-issue chips for the team's highest-signal issues, each firing the
    //     same _myteamOpenIssueEvidence jump the alignment chips use (issue-filtered
    //     Locker with the saved team carried along as highlight context).
    // Honesty-gated throughout: an entry point only appears when there is real
    // evidence behind it. While the Locker library is still loading the counts read
    // null, so we paint optimistically and the pdx-evidence-ready repaint trims any
    // entry point that turns out empty. `pids` is the full saved roster; `ta` is the
    // team-alignment aggregate (may be null when the visitor hasn't picked issues —
    // the Browse summary still renders, the issue chips simply don't).
    function _renderTeamEvidenceSection(pids, ta) {
      if (!pids || !pids.length) return '';
      if (typeof window._pdxOpenEvidenceLocker !== 'function') return '';

      // Team-wide evidence count (null = library still loading → show optimistically).
      var total = (typeof window._pdxEvidenceCountForPeople === 'function')
        ? window._pdxEvidenceCountForPeople(pids) : null;
      var showBrowse = (total === null) || (total > 0);

      // High-signal issue chips: the team's selected issues (strongest match first)
      // that actually have evidence on record, capped so the row stays scannable.
      var issueChips = [];
      if (ta && ta.issues && ta.issues.length) {
        issueChips = ta.issues.filter(function (i) {
          if (!i.key) return false;
          if (typeof window._pdxEvidenceOnRecord !== 'function') return true; // can't rule out
          var onRec = window._pdxEvidenceOnRecord([i.key]);   // null = still loading
          return onRec === null || onRec.length > 0;
        }).slice(0, 5);
      }

      if (!showBrowse && !issueChips.length) return '';   // nothing real to link to

      // Carry the full saved team so each per-issue jump highlights the right
      // lineup — same channel _myteamOpenIssueEvidence reads. Built from the saved
      // roster (with live names) so it's complete even if alignment scoring covered
      // only a subset.
      window._pdxTeamEvidenceCtx = {
        pols: pids.slice(),
        names: pids.map(function (p) {
          var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[p] : null;
          return d ? d.name : '';
        })
      };

      var html = '<div class="myteam-ev-head">' +
          '<span class="myteam-ev-ico" aria-hidden="true">📂</span>' +
          '<div class="myteam-ev-head-tx">' +
            '<div class="myteam-ev-title">My Team’s Evidence</div>' +
            '<div class="myteam-ev-sub">Go straight from your team to what the record actually shows — every link opens the receipts in the Evidence Locker.</div>' +
          '</div>' +
        '</div>';

      if (showBrowse) {
        var jsIds = pids.map(function (p) {
          return "'" + String(p).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }).join(',');
        var lab = (total === null)
          ? 'On-record evidence across your saved team'
          : '<b>' + total + '</b> evidence item' + (total === 1 ? '' : 's') + ' on record across your saved team';
        html += '<div class="myteam-ev-summary">' +
            '<div class="myteam-ev-summary-tx">' +
              '<div class="myteam-ev-summary-n">' + (total === null ? '📂' : total) + '</div>' +
              '<div class="myteam-ev-summary-lab">' + lab + '</div>' +
            '</div>' +
            '<button type="button" class="myteam-ev-browse" ' +
              'onclick="window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pols:[' + jsIds + ']});" ' +
              'title="Open the Evidence Locker focused on your saved team" ' +
              'aria-label="Browse the Evidence Locker focused on your saved team">' +
              'Browse team evidence <span aria-hidden="true">↗</span>' +
            '</button>' +
          '</div>';
      }

      if (issueChips.length) {
        var chips = issueChips.map(function (i) {
          var jk = String(i.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return '<button type="button" class="myteam-ev-chip" ' +
              'onclick="window._myteamOpenIssueEvidence&&window._myteamOpenIssueEvidence(\'' + jk + '\');" ' +
              'title="See everyone’s evidence on ' + i.label + ' — your saved team is highlighted" ' +
              'aria-label="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team is highlighted">' +
              '<span class="myteam-ev-chip-lab">' + i.label + '</span>' +
              '<span class="myteam-ev-chip-cue" aria-hidden="true">📂 ↗</span>' +
            '</button>';
        }).join('');
        html += '<div class="myteam-ev-issues">' +
            '<span class="myteam-ev-issues-lab">Jump into a top issue</span>' +
            chips +
          '</div>';
      }

      return html;
    }
    window._renderTeamEvidenceSection = _renderTeamEvidenceSection;

    function _alignScoreColor(s) {
      if (s === null || s === undefined) return '#a78bfa';
      return s >= 70 ? '#4ade80' : s >= 50 ? '#f5c842' : '#f87171';
    }

    // The visitor's own selected issues that this candidate scores highest on — the
    // concrete reasons behind their Your Match %. Surfaced inline (right under the
    // match bar / band) so the number explains itself at a glance, no modal needed.
    // Only issues with real evidence and a genuinely matching score are shown, ranked
    // best-first and capped, so it stays clean across a dense list. A ★ marks an issue
    // the visitor weighted "strong". Returns '' when alignment isn't set up or there's
    // no grounded breakdown to draw from.
    function _alignDriverChips(pid, max) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      if (typeof _calcAlignmentBreakdown !== 'function') return '';
      var bd = _calcAlignmentBreakdown(pid);
      if (!bd || !bd.issues || !bd.issues.length) return '';
      max = max || 2;
      var ranked = bd.issues.filter(function(i) { return i.hasEvidence && i.score >= 50; })
                            .sort(function(a, b) { return b.score - a.score; });
      if (!ranked.length) return '';
      var chips = ranked.slice(0, max).map(function(i) {
        var c = _alignScoreColor(i.score);
        var _lvl = _alignMigrateLevel(i.intensity);
        var strong = (_lvl === 'strongly_support' || _lvl === 'strongly_oppose') ? '★ ' : '';
        return '<span class="align-driver-chip" title="' + (strong ? 'You weighted this strongly · ' : '') + 'Your match on ' + i.label + '" style="border-color:' + c + '40;background:' + c + '12;">' +
            '<span style="color:#cdd9ec;">' + strong + i.label + '</span><b style="color:' + c + ';">' + i.score + '%</b>' +
          '</span>';
      }).join('');
      return '<div class="align-drivers"><span class="align-drivers-lead">▲ Driven by</span>' + chips + '</div>';
    }
    window._alignDriverChips = _alignDriverChips;

    function _alignScoreClass(s) {
      if (s === null || s === undefined) return '';
      return s >= 70 ? 'high' : s >= 50 ? 'mid' : 'low';
    }

    // Prominent, tappable "Your Match" bar used on the browse / database / candidate
    // card lists. Unlike the small corner ring, this reads as a core feature: a big
    // teal score, a plain-language "Your Match: NN%" label, a colour-coded
    // Strong / Partial / Weak badge, a mini progress bar, and a clear note that the
    // number is built from the visitor's own selected issues. Tapping opens the full
    // issue-by-issue breakdown modal (shared with Your Key Races) for any politician.
    // Returns:
    //   • a "See Your Personal Match" prompt (→ issue picker) when no issues chosen,
    //   • '' when issues are chosen but this person has no record to ground a score
    //     (keeps recordless candidate cards clean),
    //   • the full match bar otherwise.
    function _alignCardBar(pid) {
      var n = (typeof window._alignIssueCount === 'function') ? window._alignIssueCount()
            : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) || 0);
      if (!n) {
        return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView){window.keyRacesAlignQuickView(\'' + pid + '\');}else if(window._krAlignGuideToPicker){window._krAlignGuideToPicker();}" class="align-card-bar setup" aria-label="See the issues this politician has positions on and build your personalized match — judge them by your values, not their party">' +
            '<span class="align-card-num" style="color:#5eead4;font-size:1.15rem;">🎯</span>' +
            '<span class="align-card-main" style="gap:0.1rem;">' +
              '<span class="align-card-title">See Your Personal Match</span>' +
              '<span class="align-card-sub">Judge them by your values, not their party</span>' +
            '</span>' +
            '<span class="align-card-chev">›</span>' +
          '</button>';
      }
      var score = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (score === null || score === undefined) return '';
      var col = _alignScoreColor(score);
      var label = score >= 85 ? '⭐ Best Match for You' : score >= 70 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match';
      var drivers = (typeof _alignDriverChips === 'function') ? _alignDriverChips(pid, 2) : '';
      // Note when the Accountability Score is part of this match, so a voter sees
      // both dimensions — issue fit AND integrity — feeding the number at a glance.
      var _acctForMatch = (typeof window._acctMatchScore === 'function') ? window._acctMatchScore(pid) : null;
      var _acctSub = (typeof _acctForMatch === 'number')
        ? ' · <span style="color:#c4b5fd;">🛡️ incl. accountability ' + _acctForMatch + '</span>'
        : '';
      return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');" class="align-card-bar" aria-label="Your match: ' + score + ' percent — ' + label + ' on your selected issues, including their accountability score. Tap for the issue-by-issue breakdown." style="border-color:' + col + '66;box-shadow:inset 0 0 0 1px ' + col + '22;">' +
          '<span class="align-card-num" style="color:' + col + ';text-shadow:0 0 12px ' + col + '55;">' + score + '<span style="font-size:0.95rem;">%</span></span>' +
          '<span class="align-card-main">' +
            '<span class="align-card-titlerow">' +
              '<span class="align-card-title" style="color:' + col + ';">🎯 Your Match</span>' +
              '<span class="align-card-badge" style="color:' + col + ';background:' + col + '22;border:1px solid ' + col + '66;">' + label + '</span>' +
            '</span>' +
            '<span class="align-card-mini"><div style="width:' + score + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></div></span>' +
            '<span class="align-card-sub">Based on <b>your ' + n + ' selected issue' + (n > 1 ? 's' : '') + '</b>' + _acctSub + ' · tap for breakdown</span>' +
          '</span>' +
          '<span class="align-card-chev">▾</span>' +
        '</button>' + drivers;
    }
    window._alignCardBar = _alignCardBar;

    // Prominent, glanceable "Your Match" band for the My Voting Team slot cards.
    // Replaces the old tiny corner pill: a big colour-coded %, a plain-language
    // Strong / Partial / Weak word and a mini progress bar, so the personalized
    // fit reads at a glance on every team slot. Tapping opens the same
    // issue-by-issue breakdown modal used everywhere else. Returns '' when the
    // visitor hasn't set up alignment (the section-level prompt handles that) or
    // when there's no record to ground a score (keeps the slot clean).
    function _slotMatchBand(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var score = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (score === null || score === undefined) return '';
      var col = _alignScoreColor(score);
      var label = score >= 85 ? '⭐ Best Match for You' : score >= 70 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match';
      var drivers = (typeof _alignDriverChips === 'function') ? _alignDriverChips(pid, 3) : '';
      return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');" class="myteam-slot-match" title="Your match on your selected issues — tap for the issue-by-issue breakdown" style="border-color:' + col + '55;box-shadow:inset 0 0 0 1px ' + col + '1f;">' +
          '<span class="myteam-slot-match-num" style="color:' + col + ';text-shadow:0 0 12px ' + col + '55;">' + score + '<span style="font-size:0.85rem;">%</span></span>' +
          '<span class="myteam-slot-match-mid">' +
            '<span class="myteam-slot-match-label">🎯 Your Match · <b style="color:' + col + ';">' + label + '</b></span>' +
            '<span class="myteam-slot-match-bar"><span style="width:' + score + '%;background:linear-gradient(90deg,' + col + '99,' + col + ');"></span></span>' +
          '</span>' +
        '</button>' + drivers;
    }
    window._slotMatchBand = _slotMatchBand;

    // "Top Match" ribbon for browse cards — clearly flags the strongest alignment
    // matches at a glance while picking a candidate for a slot. Only appears once
    // the visitor has an Alignment Signature and the match is genuinely high.
    function _alignTopMatchBadge(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var s = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (s === null || s === undefined || s < 75) return '';
      return '<span class="align-topmatch-badge">🎯 Top Match · ' + s + '%</span>';
    }
    window._alignTopMatchBadge = _alignTopMatchBadge;

    function _alignScoreHtml(pid, size, usePurpleTheme) {
      if (_alignIssues.size === 0) {
        if (size === 'ring') {
          if (usePurpleTheme) {
            return '<button onclick="event.stopPropagation();var p=document.getElementById(\'relevant-alignments-panel\')||document.getElementById(\'alignment-panel\');if(p){p.scrollIntoView({behavior:\'smooth\',block:\'center\'});var body=document.getElementById(\'relevant-alignments-body\');if(body&&body.style.display===\'none\'){toggleRelevantAlignments();}}" class="font-condensed text-[10px] font-bold text-purple-300 hover:text-purple-200 hover:bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 uppercase tracking-wider" style="background:rgba(139,92,246,0.1);min-height:38px;box-shadow:0 0 10px rgba(139,92,246,0.15);">' +
              '<span>🎯</span> Set Align' +
              '</button>';
          }
          return '<button onclick="event.stopPropagation();if(window.alignTogglePanel)window.alignTogglePanel(true);var p=document.getElementById(\'alignment-panel\');if(p)p.scrollIntoView({behavior:\'smooth\',block:\'center\'});" class="font-condensed text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-900/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 uppercase tracking-wider" style="background:rgba(139,92,246,0.05);min-height:30px;">' +
            '<span>🎯</span> Align' +
            '</button>';
        }
        return '';
      }
      var score = _calcAlignmentScore(pid);
      if (score === null) return '';
      var col = usePurpleTheme ? '#c084fc' : _alignScoreColor(score);
      var cls = _alignScoreClass(score);
      // Every scored output is now tappable and opens the shared issue-by-issue
      // breakdown modal, so personalized alignment is an explorable feature on every
      // card list — not just a static number.
      var _openBd = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';
      if (size === 'small') {
        return '<button type="button" onclick="' + _openBd + '" class="align-score-badge" title="Your match on your selected issues — tap for the breakdown" style="cursor:pointer;font:inherit;border-color:' + col + '40;color:' + col + ';background:' + col + '18;">🎯 Your Match ' + score + '%</button>';
      }

      if (usePurpleTheme) {
        return '<button type="button" onclick="' + _openBd + '" title="Your match: ' + score + '% — tap for the issue-by-issue breakdown" style="display:inline-flex;flex-direction:column;align-items:center;gap:0.1rem;flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;">' +
          '<div style="text-align:center;background:rgba(10,15,30,0.65);border:1px solid rgba(139,92,246,0.45);border-radius:0.75rem;padding:0.45rem 0.8rem;box-shadow:0 4px 16px rgba(139,92,246,0.22), inset 0 1px 0 rgba(255,255,255,0.02);display:inline-block;min-width:78px;">' +
            '<div style="color:#c084fc;font-size:2.2rem;text-shadow:0 0 12px rgba(139,92,246,0.4);font-family:\'Bebas Neue\',sans-serif;line-height:1;font-weight:900;">' + score + '%</div>' +
            '<div class="font-condensed text-xs text-purple-300 tracking-wider uppercase text-center font-bold" style="font-size:0.55rem;margin-top:0.15rem;letter-spacing:0.05em;">🎯 Your Match</div>' +
          '</div>' +
        '</button>';
      }

      return '<button type="button" onclick="' + _openBd + '" title="Your match: ' + score + '% — tap for the issue-by-issue breakdown" style="display:inline-flex;flex-direction:column;align-items:center;gap:0.15rem;flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;">' +
        '<div class="align-score-ring ' + cls + '" style="border-color:' + col + '99;color:' + col + ';background:' + col + '14;box-shadow:0 0 14px ' + col + '22;">' + score + '%</div>' +
        '<div class="align-pct-label" style="color:' + col + '99;">🎯 Your Match</div>' +
      '</button>';
    }

    // Brief pulse on every chip that represents an issue, wherever it's mounted.
    function _alignPulse(issue) {
      document.querySelectorAll('.align-chip[data-align-issue="' + issue + '"]').forEach(function(c) {
        c.classList.remove('just-toggled'); void c.offsetWidth; c.classList.add('just-toggled');
        setTimeout(function() { c.classList.remove('just-toggled'); }, 360);
      });
    }

    window.alignToggle = function(btn) {
      var issue = btn.getAttribute('data-align-issue');
      if (!issue) return;
      if (_alignIssues.has(issue)) {
        _alignIssues.delete(issue);
        delete _alignIntensity[issue]; // dropping the issue drops its intensity too
      } else {
        _alignIssues.add(issue);
      }
      _alignSave();
      // _alignRefreshAll re-syncs every chip across both panels, so the chip the
      // visitor clicked and its twin on the other surface stay in lockstep.
      _alignRefreshAll();
      _alignPulse(issue);
    };

    // Quick 5-point stance preset for a single position. Choosing any preset implies
    // the position is selected, so a visitor can go from nothing to a weighted
    // "Strongly Oppose" in one tap. 'support' is the default and clears the overlay;
    // the other four levels are stored. Legacy values are migrated before storing.
    window.alignSetIntensity = function(issue, level) {
      if (!ISSUE_MAP[issue]) return;
      if (!_alignIssues.has(issue)) _alignIssues.add(issue);
      var lvl = _alignMigrateLevel(level);
      if (lvl === ALIGN_DEFAULT_LEVEL) delete _alignIntensity[issue];
      else if (ALIGN_LEVELS.indexOf(lvl) !== -1) _alignIntensity[issue] = lvl;
      _alignSave();
      _alignRefreshAll();
      _alignPulse(issue);
    };

    window.alignClearAll = function() {
      _alignIssues.clear();
      _alignIntensity = {};
      _alignExposeIntensity();
      _alignSave();
      _alignRefreshAll();
    };

    function _alignRefreshAll() {
      _alignSyncAllChips();
      _alignUpdateStatus();
      _alignRenderProfile();
      _alignUpdateFab();
      _alignSyncBrowseChips();

      if (typeof syncRelevantAlignmentUI === 'function') {
        syncRelevantAlignmentUI();
      }

      if (typeof window.renderRelevantToMe === 'function') {
        window.renderRelevantToMe();
      }

      if (typeof _mypolBuildGrid === 'function') _mypolBuildGrid();

      if (typeof chubFilter === 'function') chubFilter();

      if (typeof _potentialBuildGrid === 'function') _potentialBuildGrid();

      if (typeof filterDirectory === 'function') filterDirectory();

      // The All Politicians browse tree carries the same district-level "Your Match
      // in this race" panels, so re-render it too when it's actually on screen (its
      // accordion open-state is preserved), so a quick-pick made there re-ranks the
      // race immediately. Skipped when the panel is hidden to avoid needless work.
      if (typeof window.myteamBrowseFilter === 'function') {
        var _apg = document.getElementById('myteam-browse-grid');
        if (_apg && _apg.offsetParent !== null) window.myteamBrowseFilter();
      }

      var cmpOverlay = document.getElementById('compare-overlay');
      if (cmpOverlay && cmpOverlay.style && cmpOverlay.style.display !== 'none') {
        if (typeof _buildCmpTable === 'function') _buildCmpTable();
      }
      // Keep the floating Compare button's "🎯 by match" hint in step with the
      // visitor's current issue selection.
      if (typeof _updateCmpFloat === 'function') _updateCmpFloat();

      // Keep the inline alignment % on the Your Key Races candidate cards in sync
      // with the issues the visitor just changed.
      if (typeof window.renderKeyRaces === 'function') window.renderKeyRaces();
    }

    function syncRelevantAlignmentUI() {
      // Chip active-state is handled centrally by _alignSyncAllChips; here we only
      // keep the "My Key Alignments" status line in step with the selection.
      var statusEl = document.getElementById('relevant-align-status');
      if (statusEl) {
        var n = _alignIssues.size;
        if (n === 0) {
          statusEl.textContent = 'No issues selected. All representative cards show default view.';
          statusEl.style.color = '';
        } else {
          var labels = [];
          _alignIssues.forEach(function(k) {
            if (ISSUE_MAP[k]) labels.push(ISSUE_MAP[k].label);
          });
          statusEl.innerHTML = '<span style="color:#c084fc;font-weight:700;">' + n + ' active issue' + (n > 1 ? 's' : '') + '</span> — <span class="text-steel-400">' + labels.join(' · ') + '</span>';
        }
      }
    }

    window.syncRelevantAlignmentUI = syncRelevantAlignmentUI;

    window.toggleRelevantCheckbox = function(checkbox) {
      // Legacy entry point (the panel now uses chips). Kept so any cached markup
      // still toggles correctly; routes through the same unified path.
      var issue = checkbox.getAttribute('data-relevant-issue');
      if (!issue) return;
      if (checkbox.checked) _alignIssues.add(issue);
      else _alignIssues.delete(issue);
      _alignSave();
      _alignRefreshAll();
    };

    window.relevantAlignClearAll = function() {
      _alignIssues.clear();
      _alignIntensity = {};
      _alignExposeIntensity();
      _alignSave();
      _alignRefreshAll();
    };

    window.toggleRelevantAlignments = function(openState) {
      var body = document.getElementById('relevant-alignments-body');
      var chevron = document.getElementById('relevant-alignments-chevron');
      if (!body) return;
      
      var isCollapsed = body.style.display === 'none';
      var shouldOpen = (openState !== undefined) ? openState : isCollapsed;
      
      if (shouldOpen) {
        body.style.display = 'block';
        if (chevron) {
          chevron.style.transform = 'rotate(180deg)';
        }
      } else {
        body.style.display = 'none';
        if (chevron) {
          chevron.style.transform = '';
        }
      }
    };

    function _alignInjectIntoCard(card, pid) {
      var existing = card.querySelector('.align-inject');
      if (existing) existing.remove();
      if (_alignIssues.size === 0) return;
      var html = _alignScoreHtml(pid, 'small');
      if (!html) return;
      var nameRow = card.querySelector('.flex.items-center.gap-2.flex-wrap');
      if (nameRow) {
        var span = document.createElement('span');
        span.className = 'align-inject';
        span.innerHTML = html;
        nameRow.appendChild(span);
      }
    }

    function _alignUpdateStatus() {
      var el = document.getElementById('align-status');
      if (!el) return;
      var n = _alignIssues.size;
      if (n === 0) {
        el.textContent = 'Select issues above to see personalized alignment scores on every politician card.';
        el.style.color = '';
      } else {
        var labels = [];
        _alignIssues.forEach(function(k) { if (ISSUE_MAP[k]) labels.push(ISSUE_MAP[k].label); });
        el.innerHTML = '<span style="color:#a78bfa;font-weight:700;">' + n + ' issue' + (n > 1 ? 's' : '') + ' selected</span> — alignment scores now visible on all politician cards. <span style="color:#7c3aed;">' + labels.join(' · ') + '</span>';
      }
    }

    function _alignSyncBrowseChips() {
      var wrap = document.getElementById('chub-align-chips');
      var status = document.getElementById('chub-align-status');
      if (!wrap) return;
      var n = _alignIssues.size;
      if (n === 0) {
        wrap.innerHTML = '<span class="font-condensed text-xs text-steel-500">Set your issues in the Alignment Score panel above to filter by alignment</span>';
        if (status) status.textContent = '';
      } else {
        var html = '';
        Object.keys(ISSUE_MAP).forEach(function(key) {
          if (_alignIssues.has(key)) {
            html += '<span class="inline-flex items-center gap-1 bg-purple-900/30 border border-purple-500/30 rounded-full px-2.5 py-1 font-condensed text-xs text-purple-300 tracking-wider">' + ISSUE_MAP[key].label + '</span>';
          }
        });
        wrap.innerHTML = html;
        if (status) status.textContent = n + ' issue' + (n > 1 ? 's' : '') + ' active — cards show alignment %';
      }
    }

    window._calcAlignmentScore = _calcAlignmentScore;
    window._calcAlignmentBreakdown = _calcAlignmentBreakdown;
    window._alignIssueCount = function() { return _alignIssues.size; };
    window._alignScoreHtml = _alignScoreHtml;
    window._alignScoreColor = _alignScoreColor;
    window._alignScoreClass = _alignScoreClass;
    window._alignIssues = _alignIssues;
    // Exposed so the Key Races inline alignment breakdown can offer quick
    // add/remove issue chips. ISSUE_MAP gives the available issues + labels;
    // alignToggleIssue flips one and re-syncs every alignment-aware surface
    // (including the main picker chips and the Key Races cards) in one call.
    window._alignIssueMap = ISSUE_MAP;
    window.alignToggleIssue = function(issueKey) {
      if (!ISSUE_MAP[issueKey]) return;
      if (_alignIssues.has(issueKey)) {
        _alignIssues.delete(issueKey);
        delete _alignIntensity[issueKey];
      } else {
        _alignIssues.add(issueKey);
      }
      _alignSave();
      // _alignRefreshAll re-syncs both picker panels' chips, so a change made from
      // the Key Races quick-adjust mirrors onto the pickers and vice-versa.
      _alignRefreshAll();
      _alignPulse(issueKey);
    };

    // ── My Alignment Profile summary ───────────────────────────
    // A live, scannable overview of the visitor's current picks: how many positions,
    // the Strong / Moderate / Opposed mix (with a proportional strength meter), the
    // topics they've defined most, and the topics they haven't weighed in on yet.
    // Every area chip jumps straight back into the picker for that topic.
    // ── Quick Picks — popular specific issues for a fast start ─────────
    // A curated, ideologically-balanced shortlist of the most-asked-about granular
    // issues. The chips carry the same data-align-issue contract as the full picker,
    // so _alignSyncAllChips toggles their active state and alignToggle handles taps —
    // no separate state to keep in sync.
    var ALIGN_QUICK_PICKS = [
      'aidc', 'term_limits', 'border_security', 'deportations', 'healthcare', 'gun_rights',
      'school_choice', 'climate_action', 'energy_production', 'cost_living', 'housing', 'homeless',
      'social_security', 'national_debt', 'cut_spending', 'property_tax', 'child_care',
      'immigration_reform', 'water', 'health_mental', 'gun_safety',
      'voter_id', 'tough_on_crime', 'end_dei', 'tariffs_china', 'america_first_fp'
    ];
    // Exposed so the per-politician alignment discovery modal (in the Key Races
    // script) can offer the same curated "popular issues" as tap-to-add chips when
    // a visitor opens a candidate's match before picking any issues of their own.
    window._alignQuickPicks = ALIGN_QUICK_PICKS;

    // The newer, high-engagement issues added in the 2026 refresh. Flagged with a
    // small 🔥 in Quick Picks so they're easy to spot as fresh, hot-topic picks.
    var ALIGN_HOT_ISSUES = {
      end_dei: 1, america_first_fp: 1, tariffs_china: 1, voter_id: 1,
      tough_on_crime: 1, deportations: 1
    };

    function _alignRenderQuickPicks() {
      var el = document.getElementById('align-quickpicks');
      if (!el) return;
      var chips = ALIGN_QUICK_PICKS.filter(function(k) { return !!ISSUE_MAP[k]; }).map(function(k) {
        var d = ISSUE_MAP[k];
        var cov = _alignCoverage().byIssue[k] || 0;
        var covHtml = cov > 0 ? '<span class="align-quick-cov" title="' + cov + ' politician' + (cov === 1 ? '' : 's') + ' with a documented position on this issue">📍' + cov + '</span>' : '';
        var hot = ALIGN_HOT_ISSUES[k] ? ' align-quick-hot' : '';
        var hotHtml = ALIGN_HOT_ISSUES[k] ? '<span class="align-quick-flame" title="High-engagement issue added in the 2026 refresh" aria-hidden="true">🔥</span>' : '';
        return '<button type="button" class="align-chip align-quick-chip' + hot + '" data-align-issue="' + k + '"' +
          ' aria-pressed="false" title="' + d.chip + '" onclick="alignToggle(this)">' + hotHtml + d.label + covHtml + '</button>';
      }).join('');
      el.innerHTML =
        '<div class="align-quick-label">⚡ Quick picks ' +
          '<span class="align-quick-hint">popular specific issues — tap to add · 🔥 = high engagement</span></div>' +
        '<div class="align-quick-row">' + chips + '</div>';
    }

    function _alignRenderProfile() {
      var el = document.getElementById('align-profile-summary');
      if (!el) return;
      var n = _alignIssues.size;
      if (n === 0) {
        el.innerHTML =
          '<div class="align-profile-head"><div class="align-profile-title">🧭 My Alignment Profile</div></div>' +
          '<div class="align-profile-empty">You haven\'t picked any positions yet. Check the issues you agree with below — pick as many as you like and tap <b>Strongly Support</b> through <b>Strongly Oppose</b> to set your stance on each one. Your match score then appears on every politician card.</div>';
        return;
      }

      // Roll the five stance levels into three readable buckets for the summary:
      // support (support + strongly_support), neutral, and opposed (oppose +
      // strongly_oppose). A bare selection counts as the default 'support'.
      var support = 0, opposed = 0, neutral = 0, strong = 0;
      var catCounts = {};
      _alignIssues.forEach(function(k) {
        var lvl = _alignMigrateLevel(_alignIntensity[k] || ALIGN_DEFAULT_LEVEL);
        if (lvl === 'strongly_support' || lvl === 'strongly_oppose') strong++;
        if (lvl === 'oppose' || lvl === 'strongly_oppose') opposed++;
        else if (lvl === 'neutral') neutral++;
        else support++;
        var d = ISSUE_MAP[k];
        if (d && d.cat) catCounts[d.cat] = (catCounts[d.cat] || 0) + 1;
      });

      // Plain-language strength sentence. The count of strongly-held positions is
      // pulled out into its own conviction callout below the meter (clearer than a
      // parenthetical), so the sentence itself stays about the support/oppose mix.
      var parts = [];
      if (support > 0) parts.push('<b class="s-strong">support</b> on <b>' + support + '</b>');
      if (neutral > 0) parts.push('<b class="s-mod">neutral</b> on <b>' + neutral + '</b>');
      if (opposed > 0) parts.push('<b class="s-opp">opposed</b> on <b>' + opposed + '</b>');
      var sentence = parts.length
        ? 'You ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]) + ' of your <b>' + n + '</b> position' + (n > 1 ? 's' : '') + '.'
        : 'You have selected <b>' + n + '</b> position' + (n > 1 ? 's' : '') + '.';

      // Proportional three-segment strength meter (support / neutral / opposed).
      var sw = Math.round(support / n * 100);
      var mw = Math.round(neutral / n * 100);
      var ow = Math.max(0, 100 - sw - mw);
      var meter = '<div class="align-strength-meter" aria-hidden="true">' +
        (sw > 0 ? '<div class="align-strength-seg strong" style="width:' + sw + '%;"></div>' : '') +
        (mw > 0 ? '<div class="align-strength-seg moderate" style="width:' + mw + '%;"></div>' : '') +
        (ow > 0 ? '<div class="align-strength-seg opposed" style="width:' + ow + '%;"></div>' : '') +
      '</div>';

      // Strongest areas = the categories with the most chosen positions. Areas to
      // explore = categories still untouched (the visitor's weakest coverage).
      var withCounts = ALIGN_CATEGORIES.map(function(c) { return { c: c, n: catCounts[c.key] || 0 }; });
      var covered = withCounts.filter(function(x) { return x.n > 0; }).sort(function(a, b) { return b.n - a.n; });
      var todo = withCounts.filter(function(x) { return x.n === 0; });

      function areaChip(x, isTodo) {
        return '<button type="button" class="align-area-chip' + (isTodo ? ' todo' : '') + '" onclick="alignJumpToCategory(\'' + x.c.key + '\')" title="Jump to ' + x.c.label + ' in the picker">' +
          '<span>' + x.c.icon + '</span><span>' + x.c.label + '</span>' +
          (isTodo ? '' : '<span class="n">' + x.n + '</span>') +
        '</button>';
      }

      var strongestHtml = covered.slice(0, 4).map(function(x) { return areaChip(x, false); }).join('');
      var todoHtml = todo.length
        ? todo.slice(0, 4).map(function(x) { return areaChip(x, true); }).join('')
        : '<span class="align-profile-empty" style="font-size:0.78rem;">Every topic covered — nice work. 🎉</span>';

      // Conviction callout: how many positions are held strongly (they carry the
      // heaviest weight in match scoring). A friendly nudge when none are yet.
      var convHtml = strong > 0
        ? '<div class="align-conviction"><span class="align-conviction-pill">💪 ' + strong + ' strong conviction' + (strong > 1 ? 's' : '') + '</span>' +
            '<span class="align-conviction-note">' + strong + ' of your ' + n + ' position' + (n > 1 ? 's' : '') + ' ' + (strong > 1 ? 'are' : 'is') + ' held strongly — these weigh most in your matches.</span></div>'
        : '<div class="align-conviction"><span class="align-conviction-note align-conviction-none">Tip: use <b>Strongly Support</b> or <b>Strongly Oppose</b> on the issues you care most about — they count extra toward your matches.</span></div>';

      el.innerHTML =
        '<div class="align-profile-head">' +
          '<div class="align-profile-title">🧭 My Alignment Profile</div>' +
          '<span class="align-count-pill">' + n + ' position' + (n > 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="align-profile-strength">' + sentence + '</div>' +
        meter +
        convHtml +
        '<div class="align-profile-cols">' +
          '<div><div class="align-profile-col-label">💪 Strongest areas</div><div class="align-area-chips">' + strongestHtml + '</div></div>' +
          '<div><div class="align-profile-col-label">🧩 Areas to explore</div><div class="align-area-chips">' + todoHtml + '</div></div>' +
        '</div>';
    }

    // Jump back into the main picker, open the requested topic and scroll to it —
    // the "make it easy to edit" affordance for the profile summary.
    window.alignJumpToCategory = function(catKey) {
      var panel = document.getElementById('alignment-panel');
      var cats = document.getElementById('align-cats-main');
      // Make sure the tool is open before we try to scroll a category into view.
      if (window.alignTogglePanel) window.alignTogglePanel(true);
      // Clear any active search so the target category is guaranteed visible.
      var search = document.getElementById('align-search-main');
      if (search && search.value) { search.value = ''; alignSearch(search, 'align-cats-main'); }
      var cat = cats ? cats.querySelector('.align-cat[data-cat="' + catKey + '"]') : null;
      if (cat) {
        cat.classList.add('open');
        var head = cat.querySelector('.align-cat-head');
        if (head) head.setAttribute('aria-expanded', 'true');
        // Let the expand animation settle so the scroll lands on the right spot.
        setTimeout(function() {
          cat.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cat.style.transition = 'box-shadow 0.4s';
          cat.style.boxShadow = '0 0 0 2px rgba(168,85,247,0.5)';
          setTimeout(function() { cat.style.boxShadow = ''; }, 900);
        }, 460);
      } else if (panel) {
        setTimeout(function() { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 460);
      }
    };

    // ── Issue search ───────────────────────────────────────────
    // Filters the accordion in one panel (scoped by catsId) against a query, hiding
    // non-matching options and the categories that end up empty, and auto-expanding
    // the categories that do match so results are visible without extra taps.
    window.alignSearch = function(input, catsId) {
      var q = (input.value || '').trim().toLowerCase();
      var wrap = input.closest('.align-search-wrap');
      if (wrap) wrap.classList.toggle('has-text', !!q);
      var cats = document.getElementById(catsId);
      if (!cats) return;
      var anyVisible = false;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        var head = cat.querySelector('.align-cat-title');
        var headText = head ? head.textContent.toLowerCase() : '';
        var headMatch = !!q && headText.indexOf(q) !== -1;
        var catHasMatch = false;
        cat.querySelectorAll('.align-opt-row').forEach(function(row) {
          var txt = row.textContent.toLowerCase();
          // Also match against the issue's hidden keyword aliases (e.g. typing
          // "data center", "ai data", "homeless" or "property tax" surfaces the
          // right position even when those words aren't in the visible chip text).
          var kwHit = false;
          if (q) {
            var rk = row.getAttribute('data-opt-row');
            var def = rk && ISSUE_MAP[rk];
            if (def && def.keywords) {
              kwHit = def.keywords.some(function(kw) { return kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1; });
            }
          }
          var match = !q || headMatch || txt.indexOf(q) !== -1 || kwHit;
          row.classList.toggle('align-hide', !match);
          if (match) catHasMatch = true;
        });
        var show = !q || catHasMatch;
        cat.classList.toggle('align-hide', !show);
        if (show) anyVisible = true;
        if (q && show) {
          cat.classList.add('open');
          var h = cat.querySelector('.align-cat-head');
          if (h) h.setAttribute('aria-expanded', 'true');
        }
      });
      // Group dividers only add noise while searching across topics — hide them.
      cats.querySelectorAll('.align-group-divider').forEach(function(d) { d.classList.toggle('align-hide', !!q); });
      var empty = document.getElementById(catsId + '-empty');
      if (empty) empty.style.display = (q && !anyVisible) ? 'flex' : 'none';
    };

    // ── Persistent floating launcher ───────────────────────────
    // Keeps the Alignment Tool reachable and top-of-mind from every section.
    // Reflects live state: a purple "set me up" before any picks, a teal
    // "see your matches" with a count once issues are chosen. Empty-state taps
    // open the picker; active taps jump the visitor to their best matches.
    function _alignUpdateFab() {
      var fab = document.getElementById('align-fab');
      if (!fab) return;
      var n = (_alignIssues && _alignIssues.size) || 0;
      var l1 = document.getElementById('align-fab-line1');
      var l2 = document.getElementById('align-fab-line2');
      var cnt = document.getElementById('align-fab-count');
      fab.style.display = 'inline-flex';
      if (n === 0) {
        fab.classList.add('is-empty');
        fab.classList.remove('is-active');
        if (l1) l1.textContent = 'Match your values';
        if (l2) l2.textContent = 'See past party — find your fit';
        if (cnt) cnt.style.display = 'none';
        fab.setAttribute('aria-label', 'Set up the Personalized Alignment Tool — match politicians to your values');
      } else {
        fab.classList.remove('is-empty');
        fab.classList.add('is-active');
        if (l1) l1.textContent = 'See your best matches';
        if (l2) l2.textContent = n + ' issue' + (n > 1 ? 's' : '') + ' active · tap to compare';
        if (cnt) { cnt.style.display = 'inline-flex'; cnt.textContent = n; }
        fab.setAttribute('aria-label', 'See your best-matched politicians — ' + n + ' issue' + (n > 1 ? 's' : '') + ' selected');
      }
    }
    window._alignUpdateFab = _alignUpdateFab;

    window._alignFabAction = function() {
      // One tap from any browsing section opens the ranked Best-Matches board —
      // pick issues right there (empty state) or jump straight to the live ranking.
      if (typeof window.openAlignBoard === 'function') { window.openAlignBoard(); return; }
      // Fallback to the legacy picker/sort flow if the board hasn't loaded.
      var n = (typeof _alignIssues !== 'undefined' && _alignIssues) ? _alignIssues.size : 0;
      if (n === 0) {
        if (window._krAlignGuideToPicker) window._krAlignGuideToPicker();
      } else if (window.alignSeeMatches) {
        window.alignSeeMatches();
      }
    };

    function _alignInit() {
      _alignLoad();
      // _alignLoad may replace the _alignIssues Set, so re-export the live
      // reference (the Key Races quick-adjust reads window._alignIssues directly).
      window._alignIssues = _alignIssues;
      _alignRenderQuickPicks();
      _alignRenderPickers();
      _alignUpdateStatus();
      _alignRenderProfile();
      _alignSyncBrowseChips();
      syncRelevantAlignmentUI();
      _alignUpdateSigninPrompt();
      _alignUpdateFab();
      _alignBindAuth();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _alignInit);
    else _alignInit();
  })();
