// Change this to your Codespace's forwarded backend URL, e.g.
// https://your-codespace-name-8000.app.github.dev
// Set it via an environment variable so it's easy to change without editing code.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type LgaRiskMapEntry = {
  gid_2: string;
  state: string;
  lga: string;
  phase_number: number;
  phase_label: string;
  is_crisis: boolean;
  crisis_probability: number;
  crisis_uncertainty: number;
  exercise_year: number;
  ndvi_mean_6m: number;
  rainfall_sum_6m: number;
  lst_mean_6m: number;
  nightlight_mean_6m: number;
  ndvi_anomaly_6m: number;
  rainfall_anomaly_6m: number;
  ndvi_mean_3m: number;
  rainfall_sum_3m: number;
  conflict_events_6m: number;
  conflict_fatalities_6m: number;
  population: number;
  current_phase_class: number;
  prev_projected_phase: number;
};

export type ShapFactor = {
  feature: string;
  shap_value: number;
};

export type PredictionResult = {
  lga_name: string;
  narrative: string;
  phase_prediction: {
    phase_number: number;
    phase_label: string;
    phase_label_translated: string;
    probabilities: Record<string, number>;
    probability_uncertainty: Record<string, number>;
    phase_labels_translated: Record<number, string>;
    top_factors: ShapFactor[];
  };
  crisis_plus_prediction: {
    is_crisis: boolean;
    crisis_probability: number;
    crisis_uncertainty: number;
    top_factors: ShapFactor[];
  };
};

export type Lang = "en" | "yo" | "ha" | "ig";

export const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yorùbá" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
];

// Static UI text -- separate from the backend's dynamic narrative
// translation. Same honesty note as the backend: good-faith, kept simple,
// not yet reviewed by a native speaker.
export const UI_TEXT: Record<Lang, Record<string, string>> = {
  en: {
    mapView: "Map View",
    crisisFlagged: "Flagged",
    crisisOk: "OK",
    formView: "Form / Manual Prediction",
    disclaimer: "This is an early-warning screening tool, not a final assessment. Use it alongside, not instead of, on-the-ground verification.",
    clickLga: "Click an LGA on the map",
    legend: "Risk level legend",
    noData: "No recent data",
    tapHint: "Tap or click any colored region to see its predicted risk and the factors behind that prediction.",
    gettingPrediction: "Getting prediction…",
    noRecentData: "No recent assessment data available for this LGA.",
    crisisProb: "Crisis+ probability",
    uncertaintyNote: "Range across 15 model variants: how much they disagree tells us how confident this estimate really is.",
    phaseProbabilities: "Phase probabilities",
    topFactors: "Top contributing factors",
    riskOverTime: "Risk over time",
    climateConditions: "Climate conditions",
    findMyLga: "Find my LGA",
    manualWhatIf: "Manual / what-if",
    searchPlaceholder: "Search LGA or state name…",
    selectLgaHint: "Select an LGA — the prediction loads automatically.",
    fillValuesHint: "Fill in the values and submit to see a prediction here.",
    selectLgaAutoHint: "Select an LGA on the left and its prediction will appear here automatically.",
    phaseWord: "Phase",
    vegetation: "Vegetation",
    rainfall: "Rainfall",
    landTemp: "Land temp",
    economicActivity: "Economic activity",
    vegetationChartTitle: "Vegetation health",
    rainfallChartTitle: "Rainfall",
    landTempChartTitle: "Land temperature",
    nightlightChartTitle: "Nighttime economic activity",
    lastMonths: "last {n} months",
    nightlightFootnote: "A rough proxy for local economic activity — brighter areas at night tend to indicate more commerce, electricity access, and movement.",
    climateSource: "Source: satellite data (MODIS, CHIRPS) via Google Earth Engine — real measured conditions, independent of the model's prediction.",
    loadingClimate: "Loading climate data…",
    noClimateData: "No satellite climate data available for this LGA.",
    actualLegend: "Actual (past official assessments)",
    forecastLegend: "Forecast (next assessment, not yet confirmed)",
    forecastNote: "This point is a forecast, not an official assessment.",
    now: "now",
    noHistoryData: "No historical assessment data available for this LGA.",
  },
  yo: {
    mapView: "Wiwo Maapu",
    crisisFlagged: "A ti samisi re",
    crisisOk: "O dara",
    formView: "Fọọmu / Asọtẹlẹ Afọwọṣe",
    disclaimer: "Ohun elo ikilọ ni kutukutu ni eyi, kii ṣe idajọ ikẹhin. Lo pọ pẹlu, kii ṣe dipo, ijerisi ni ori ilẹ.",
    clickLga: "Tẹ agbegbe kan lori maapu",
    legend: "Alaye awọn awọ ewu",
    noData: "Ko si data to ṣẹṣẹ",
    tapHint: "Tẹ agbegbe eyikeyi to ni awọ lati ri ewu re ati awọn idi lẹhin asọtẹlẹ naa.",
    gettingPrediction: "N gba asọtẹlẹ…",
    noRecentData: "Ko si data ayewo to ṣẹṣẹ fun agbegbe yii.",
    crisisProb: "Iṣeeṣe Idaamu+",
    uncertaintyNote: "Iyato laarin awoṣe 15: bi won ṣe yato si ara won fihan bi a ṣe le gbẹkẹle asọtẹlẹ yii to.",
    phaseProbabilities: "Iṣeeṣe ipele",
    topFactors: "Awọn idi pataki",
    riskOverTime: "Ewu ni akoko pupọ",
    climateConditions: "Ipo oju ọjọ",
    findMyLga: "Wa agbegbe mi",
    manualWhatIf: "Afọwọṣe / bi o ba jẹ",
    searchPlaceholder: "Wa agbegbe tabi ipinlẹ…",
    selectLgaHint: "Yan agbegbe kan — asọtẹlẹ yoo gba fifuye laifọwọyi.",
    fillValuesHint: "Kun awọn iye ki o si fi silẹ lati ri asọtẹlẹ nibi.",
    selectLgaAutoHint: "Yan agbegbe kan ni apa osi, asọtẹlẹ re yoo han nibi laifọwọyi.",
    phaseWord: "Ipele",
    vegetation: "Ewe/Ọgbin",
    rainfall: "Ojo",
    landTemp: "Otutu ile",
    economicActivity: "Iṣe owo",
    vegetationChartTitle: "Ilera ewe/ọgbin",
    rainfallChartTitle: "Ojo",
    landTempChartTitle: "Otutu ile",
    nightlightChartTitle: "Iṣe owo ni oru",
    lastMonths: "osu {n} seyin",
    nightlightFootnote: "Eyi to fi han iṣe owo ni agbegbe — ibi to ba ni imọlẹ ju ni oru maa n je ibi ti owo, ina, ati gbigbe eniyan wa lo ga ju.",
    climateSource: "Orisun: data satẹlaiti (MODIS, CHIRPS) nipasẹ Google Earth Engine — ipo gidi ti a wọn, ti ko sopọ mọ asọtẹlẹ awoṣe.",
    loadingClimate: "N gba data oju ọjọ…",
    noClimateData: "Ko si data oju ọjọ satẹlaiti fun agbegbe yii.",
    actualLegend: "Gidi (awọn ayewo osise ti o ti kọja)",
    forecastLegend: "Asọtẹlẹ (ayewo to n bọ, a ko ti jẹrisi)",
    forecastNote: "Aami yii je asọtẹlẹ, kii ṣe ayewo osise.",
    now: "bayii",
    noHistoryData: "Ko si data ayewo itan fun agbegbe yii.",
  },
  ha: {
    mapView: "Duban Taswira",
    crisisFlagged: "An yiwa alama",
    crisisOk: "Lafiya",
    formView: "Fom / Hasashen Hannu",
    disclaimer: "Wannan kayan aikin gargaɗi ne na farko, ba shine ƙarshen bincike ba. Yi amfani da shi tare da, ba a maimakon ba, tabbatarwa a fage.",
    clickLga: "Danna wani yanki a taswira",
    legend: "Bayanin launukan hadari",
    noData: "Babu sabon bayani",
    tapHint: "Danna kowane yanki mai launi don ganin hadarinsa da dalilan da suka jawo hasashen.",
    gettingPrediction: "Ana samun hasashe…",
    noRecentData: "Babu sabon bayanin bincike don wannan yanki.",
    crisisProb: "Yiwuwar Rikici+",
    uncertaintyNote: "Bambanci tsakanin samfura 15: yadda suke sabani da junansu yana nuna yadda za mu iya dogara da wannan hasashen.",
    phaseProbabilities: "Yiwuwar matakai",
    topFactors: "Manyan dalilai",
    riskOverTime: "Hadari akan lokaci",
    climateConditions: "Yanayin yanayi",
    findMyLga: "Nemo yankina",
    manualWhatIf: "Hannu / idan-me",
    searchPlaceholder: "Nemo yanki ko jiha…",
    selectLgaHint: "Zaɓi yanki — hasashen zai loda kansa.",
    fillValuesHint: "Cika ƙimomi ka sallama don ganin hasashe anan.",
    selectLgaAutoHint: "Zaɓi yanki a hagu, hasashensa zai bayyana anan kansa.",
    phaseWord: "Mataki",
    vegetation: "Tsirrai",
    rainfall: "Ruwan sama",
    landTemp: "Zafin kasa",
    economicActivity: "Ayyukan tattalin arziki",
    vegetationChartTitle: "Lafiyar tsirrai",
    rainfallChartTitle: "Ruwan sama",
    landTempChartTitle: "Zafin kasa",
    nightlightChartTitle: "Ayyukan tattalin arziki da dare",
    lastMonths: "watanni {n} da suka gabata",
    nightlightFootnote: "Wannan yana nuna ayyukan tattalin arziki — wurare masu haske da dare yawanci suna nufin ciniki, samun wutar lantarki, da tafiye-tafiye da yawa.",
    climateSource: "Tushen: bayanan tauraron dan adam (MODIS, CHIRPS) ta hanyar Google Earth Engine — yanayin gaskiya da aka auna, ba tare da dogaro da hasashen samfurin ba.",
    loadingClimate: "Ana samun bayanan yanayi…",
    noClimateData: "Babu bayanan yanayin tauraron dan adam don wannan yanki.",
    actualLegend: "Ainihi (bincike na hukuma da suka gabata)",
    forecastLegend: "Hasashe (bincike na gaba, ba a tabbatar ba)",
    forecastNote: "Wannan ma'auni hasashe ne, ba bincike na hukuma ba.",
    now: "yanzu",
    noHistoryData: "Babu bayanan bincike na tarihi don wannan yanki.",
  },
  ig: {
    mapView: "Nlele Map",
    crisisFlagged: "Akaraka",
    crisisOk: "Ọ dị mma",
    formView: "Fọm / Amụma Aka",
    disclaimer: "Ngwaọrụ dọ aka ná ntị nke mbụ bụ nke a, ọ bụghị nyocha ikpeazụ. Jiri ya na, ọ bụghị dochie, nkwenye n'ala.",
    clickLga: "Pịa mpaghara na map",
    legend: "Nkọwa agba ihe egwu",
    noData: "Enweghị data ọhụrụ",
    tapHint: "Pịa mpaghara ọ bụla nwere agba ka ị hụ ihe egwu ya na ihe kpatara amụma ahụ.",
    gettingPrediction: "Na-enweta amụma…",
    noRecentData: "Enweghị data nyocha ọhụrụ maka mpaghara a.",
    crisisProb: "Ohere Nsogbu+",
    uncertaintyNote: "Ọdịiche n'etiti ụdị 15: otu ha si esiri npụta ha na-egosi ka anyị ga-esi tụkwasị obi na amụma a.",
    phaseProbabilities: "Ohere ọkwa",
    topFactors: "Isi ihe kpatara",
    riskOverTime: "Ihe egwu n'oge",
    climateConditions: "Ọnọdụ ihu igwe",
    findMyLga: "Chọta mpaghara m",
    manualWhatIf: "Aka / ọ bụrụ na",
    searchPlaceholder: "Chọọ mpaghara ma ọ bụ steeti…",
    selectLgaHint: "Họrọ mpaghara — amụma ga-ebubata onwe ya.",
    fillValuesHint: "Jupụta ụkpụrụ wee nyefee ka ị hụ amụma ebe a.",
    selectLgaAutoHint: "Họrọ mpaghara n'aka ekpe, amụma ya ga-apụta ebe a onwe ya.",
    phaseWord: "Ọkwa",
    vegetation: "Ihe ọkụkụ",
    rainfall: "Mmiri ozuzo",
    landTemp: "Okpomọkụ ala",
    economicActivity: "Ọrụ akụ na ụba",
    vegetationChartTitle: "Ahụike ihe ọkụkụ",
    rainfallChartTitle: "Mmiri ozuzo",
    landTempChartTitle: "Okpomọkụ ala",
    nightlightChartTitle: "Ọrụ akụ na ụba n'abalị",
    lastMonths: "ọnwa {n} gara aga",
    nightlightFootnote: "Nke a na-egosi ọrụ akụ na ụba — ebe nwere ìhè n'abalị na-egosikarị azụmahịa, ikike ọkụ eletrik, na mmegharị dị ukwuu.",
    climateSource: "Isi mmalite: data satẹlaịtị (MODIS, CHIRPS) site na Google Earth Engine — ọnọdụ eziokwu e tụrụ, na-adabereghị n'amụma modeli ahụ.",
    loadingClimate: "Na-enweta data ihu igwe…",
    noClimateData: "Enweghị data ihu igwe satẹlaịtị maka mpaghara a.",
    actualLegend: "Eziokwu (nyocha gọọmentị gara aga)",
    forecastLegend: "Amụma (nyocha ọzọ na-abịa, akwadobeghị)",
    forecastNote: "Njirimara a bụ amụma, ọ bụghị nyocha gọọmentị.",
    now: "ugbu a",
    noHistoryData: "Enweghị data nyocha gara aga maka mpaghara a.",
  },
};

export async function fetchLgaRiskMap(): Promise<{
  count: number;
  lgas: LgaRiskMapEntry[];
}> {
  const res = await fetch(`${API_BASE_URL}/lga_risk_map`);
  if (!res.ok) throw new Error(`Failed to fetch risk map: ${res.status}`);
  return res.json();
}

export async function fetchPrediction(input: {
  lga_name: string;
  ndvi_mean_6m: number;
  rainfall_sum_6m: number;
  lst_mean_6m: number;
  nightlight_mean_6m: number;
  ndvi_anomaly_6m: number;
  rainfall_anomaly_6m: number;
  ndvi_mean_3m: number;
  rainfall_sum_3m: number;
  conflict_events_6m: number;
  conflict_fatalities_6m: number;
  population: number;
  current_phase_class: number;
  prev_projected_phase: number;
  lang?: string;
}): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
  return res.json();
}

// Friendly readable labels for feature keys, used in SHAP explanation display
export const FEATURE_LABELS: Record<string, string> = {
  ndvi_mean_6m: "Vegetation health (6mo avg)",
  rainfall_sum_6m: "Rainfall (6mo total)",
  lst_mean_6m: "Land surface temp (6mo avg)",
  nightlight_mean_6m: "Nighttime lights (economic activity)",
  ndvi_anomaly_6m: "Vegetation vs. normal-for-season",
  rainfall_anomaly_6m: "Rainfall vs. normal-for-season",
  ndvi_mean_3m: "Vegetation health (3mo avg)",
  rainfall_sum_3m: "Rainfall (3mo total)",
  conflict_events_6m: "Conflict events (6mo total)",
  conflict_fatalities_6m: "Conflict fatalities (6mo total)",
  population: "Population",
  current_phase_class: "Current known status",
  prev_projected_phase: "Status last assessment period",
};

export const PHASE_COLORS: Record<string, string> = {
  Minimal: "#4ade80",
  Stressed: "#fbbf24",
  Crisis: "#fb923c",
  Emergency: "#ef4444",
};

// All four background colors are light-to-mid tone; dark text reads clearly
// on every one of them (white text on the yellow "Stressed" badge in
// particular failed contrast badly, so this applies uniformly instead of
// per-color exceptions that are easy to get wrong later).
export const PHASE_TEXT_COLOR = "#1f2937"; // gray-800

export type LgaHistoryPoint = {
  period: string;
  phase_number: number;
  phase_label: string;
  phase_label_translated: string;
  is_forecast: boolean;
  uncertainty?: number;
};

export async function fetchLgaHistory(gid2: string, lang: string = "en"): Promise<{
  gid_2: string;
  history: LgaHistoryPoint[];
}> {
  const res = await fetch(`${API_BASE_URL}/lga_history/${gid2}?lang=${lang}`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}

export type ClimatePoint = {
  period: string;
  ndvi: number;
  rainfall_mm: number;
  lst_c: number | null;
  nightlight: number;
};

export async function fetchLgaClimate(gid2: string, months: number = 24): Promise<{
  gid_2: string;
  climate: ClimatePoint[];
}> {
  const res = await fetch(`${API_BASE_URL}/lga_climate/${gid2}?months=${months}`);
  if (!res.ok) throw new Error(`Failed to fetch climate data: ${res.status}`);
  return res.json();
}