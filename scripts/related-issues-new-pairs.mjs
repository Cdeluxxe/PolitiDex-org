// The cross-topic pairs added to related-issues.js's MAP in v523: public lands,
// housing, energy, immigration, the border and spending. Read by
// test-related-issues.mjs (the pairs are in the map, both ways, between
// existing keys) and test-related-issues-drawer.mjs (they feed the conflicts
// check). This is a test fixture, not a second map: the module never reads it.
export const NEW_PAIRS = [
  ["lands_keep_public", "housing_build"], ["lands_local", "housing_build"],
  ["housing_build", "permitting_reform"], ["housing_build", "gov_regulation"],
  ["energy_production", "cost_living"], ["enviro_energy", "cost_living"],
  ["datacenter_power", "cost_living"], ["climate_action", "cost_living"],
  ["energy_production", "econ_growth"],
  ["immig_legal", "econ_workers"], ["immig_legal", "rural_ag"],
  ["immigration_reform", "rural_ag"], ["immigration_reform", "econ_workers"],
  ["border_security", "cut_spending"],
];
