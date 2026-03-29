import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type MockProfile = {
  acneType: string;
  severity: "mild" | "moderate" | "severe";
  scoreRange: [number, number];
  percentageRange: [number, number];
  problem: string;
  summary: string;
  requirements: string[];
  triggers: { title: string; description: string }[];
  lifestyleTips: string[];
  clinicalAdvice: string;
};

const MOCK_PROFILES: MockProfile[] = [
  {
    acneType: "Comedonal Acne",
    severity: "mild",
    scoreRange: [22, 38],
    percentageRange: [8, 16],
    problem: "Mostly closed comedones around forehead and chin.",
    summary: "Mild non-inflammatory acne pattern with clustered whiteheads and minimal redness.",
    requirements: ["Gentle cleansing twice daily", "Oil-control support", "Barrier-safe hydration"],
    triggers: [
      { title: "Occlusive sunscreen", description: "Heavy products can trap sebum in pores." },
      { title: "Inconsistent cleansing", description: "Residue buildup can worsen comedones." },
    ],
    lifestyleTips: ["Switch to non-comedogenic products.", "Clean makeup tools weekly.", "Avoid over-exfoliating."],
    clinicalAdvice: "Use salicylic acid 2-3 nights weekly and reassess after 6-8 weeks.",
  },
  {
    acneType: "Inflammatory Acne",
    severity: "moderate",
    scoreRange: [45, 62],
    percentageRange: [18, 32],
    problem: "Inflamed papules on cheeks with occasional pustules.",
    summary: "Moderate inflammatory activity with visible redness in central cheek regions.",
    requirements: ["Anti-inflammatory care", "Spot treatment routine", "Daily SPF protection"],
    triggers: [
      { title: "Stress spikes", description: "Hormonal stress response may increase inflammation." },
      { title: "Sleep debt", description: "Poor sleep can delay skin recovery." },
    ],
    lifestyleTips: ["Target 7-8 hours of sleep.", "Avoid touching active lesions.", "Keep pillow covers clean."],
    clinicalAdvice: "Consider benzoyl peroxide wash and a topical retinoid under dermatologist guidance.",
  },
  {
    acneType: "Hormonal Pattern Acne",
    severity: "moderate",
    scoreRange: [50, 68],
    percentageRange: [20, 35],
    problem: "Jawline-focused papules and tender pustules suggest hormonal influence.",
    summary: "Distribution is concentrated along lower face, consistent with hormonal breakout tendency.",
    requirements: ["Consistent evening routine", "Inflammation control", "Non-irritating moisturizer"],
    triggers: [
      { title: "Cycle-related fluctuation", description: "Lesions increase around hormonal shifts." },
      { title: "High glycemic diet", description: "Rapid glucose spikes may aggravate acne." },
    ],
    lifestyleTips: ["Track breakout timing monthly.", "Reduce sugary snacks.", "Use fragrance-free skincare."],
    clinicalAdvice: "If persistent, consult dermatology for hormonal treatment options.",
  },
  {
    acneType: "Papulopustular Acne",
    severity: "severe",
    scoreRange: [72, 88],
    percentageRange: [35, 52],
    problem: "Dense papules and pustules with broad inflammatory spread across cheeks.",
    summary: "High lesion density and inflammation indicate severe active breakout state.",
    requirements: ["Urgent inflammation reduction", "Strict barrier support", "Medical review"],
    triggers: [
      { title: "Product overload", description: "Too many actives can disrupt barrier and worsen irritation." },
      { title: "Heat and sweat", description: "Humidity can increase follicular blockage." },
    ],
    lifestyleTips: ["Simplify routine to core steps.", "Rinse after sweating.", "Do not pick lesions."],
    clinicalAdvice: "Strongly consider dermatologist-led treatment for faster control and scar prevention.",
  },
  {
    acneType: "Mixed Acne",
    severity: "moderate",
    scoreRange: [48, 64],
    percentageRange: [22, 34],
    problem: "Combination of blackheads on nose and inflammatory papules on cheeks.",
    summary: "Mixed lesion types suggest both congestion and inflammatory pathways.",
    requirements: ["Balanced exfoliation", "Targeted treatment", "Routine consistency"],
    triggers: [
      { title: "Comedogenic hair products", description: "Hairline residue can trigger forehead breakouts." },
      { title: "Irregular routine", description: "Skipping treatment days reduces control." },
    ],
    lifestyleTips: ["Keep hair off forehead.", "Clean phone screen daily.", "Stay consistent for 8 weeks."],
    clinicalAdvice: "Use BHA for congestion and anti-inflammatory treatment on active areas.",
  },
  {
    acneType: "Post-Inflammatory Flare",
    severity: "mild",
    scoreRange: [28, 42],
    percentageRange: [10, 20],
    problem: "Small active lesions with lingering red marks from prior inflammation.",
    summary: "Current acne activity is mild, with visible post-inflammatory changes.",
    requirements: ["Gentle anti-acne care", "Pigment-safe sun protection", "Barrier repair"],
    triggers: [
      { title: "Picking behavior", description: "Mechanical trauma extends mark duration." },
      { title: "Sun exposure", description: "UV may worsen post-acne discoloration." },
    ],
    lifestyleTips: ["Use SPF daily.", "Avoid manual extraction.", "Introduce actives gradually."],
    clinicalAdvice: "Prioritize UV protection and low-irritation actives to prevent persistent marks.",
  },
  {
    acneType: "T-Zone Congestion",
    severity: "mild",
    scoreRange: [24, 40],
    percentageRange: [9, 18],
    problem: "Blackheads and whiteheads concentrated on forehead, nose, and chin.",
    summary: "Localized congestion pattern with low inflammatory burden.",
    requirements: ["Sebum regulation", "Pore decongestion", "Lightweight moisturizer"],
    triggers: [
      { title: "High humidity", description: "Sweat and oil can increase clogged pores." },
      { title: "Heavy makeup base", description: "Layering may worsen T-zone congestion." },
    ],
    lifestyleTips: ["Double-cleanse after makeup.", "Use non-comedogenic primer.", "Blot excess oil gently."],
    clinicalAdvice: "Use leave-on salicylic acid in T-zone and avoid harsh scrubs.",
  },
  {
    acneType: "Sensitive-Skin Acne",
    severity: "moderate",
    scoreRange: [44, 60],
    percentageRange: [16, 28],
    problem: "Scattered papules with signs of irritation from active product use.",
    summary: "Inflammation appears linked to both acne and compromised skin barrier.",
    requirements: ["Barrier-first routine", "Low-strength actives", "Irritation control"],
    triggers: [
      { title: "Over-exfoliation", description: "Excess acids can compromise barrier function." },
      { title: "Fragrance exposure", description: "Irritants may trigger redness and bumps." },
    ],
    lifestyleTips: ["Pause strong exfoliants briefly.", "Use fragrance-free moisturizer.", "Patch test new products."],
    clinicalAdvice: "Stabilize barrier before escalating acne actives.",
  },
  {
    acneType: "Adult-Onset Acne",
    severity: "moderate",
    scoreRange: [52, 66],
    percentageRange: [19, 33],
    problem: "Persistent lower-face breakouts with periodic inflammatory lesions.",
    summary: "Moderate recurrent acne likely influenced by hormonal and lifestyle factors.",
    requirements: ["Long-term maintenance plan", "Night treatment adherence", "SPF compliance"],
    triggers: [
      { title: "Stress + late nights", description: "Combined stressors can increase flare frequency." },
      { title: "Diet variability", description: "High dairy/sugar phases may worsen breakouts." },
    ],
    lifestyleTips: ["Keep a simple symptom diary.", "Stay hydrated.", "Avoid switching products too often."],
    clinicalAdvice: "If not improving in 8-12 weeks, discuss prescription options with a dermatologist.",
  },
  {
    acneType: "Acne with Early Scarring Risk",
    severity: "severe",
    scoreRange: [76, 92],
    percentageRange: [38, 58],
    problem: "Deep inflammatory lesions and recurrent picking increase scar risk.",
    summary: "Severe inflammatory distribution with risk markers for post-acne textural changes.",
    requirements: ["Rapid inflammation control", "Scar prevention strategy", "Specialist consultation"],
    triggers: [
      { title: "Manual squeezing", description: "Frequent picking raises scar and pigment risk." },
      { title: "Delayed treatment", description: "Untreated severe inflammation prolongs tissue damage." },
    ],
    lifestyleTips: ["Avoid picking at all times.", "Use hydrocolloid patches on active lesions.", "Book dermatologist review."],
    clinicalAdvice: "Prompt dermatology intervention is recommended to reduce long-term scarring.",
  },
];

function buildImageSeed(base64Image: string, datasetSeed?: string | null): number {
  const content = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  const compact = `${content.slice(0, 2500)}|${content.length}|${content.slice(-2500)}|${datasetSeed || ""}`;
  let hash = 2166136261;
  for (let i = 0; i < compact.length; i += 1) {
    hash ^= compact.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFloat(rng: () => number, min: number, max: number): number {
  return Number((rng() * (max - min) + min).toFixed(2));
}

function pickRandom<T>(rng: () => number, items: T[]): T {
  return items[randomInt(rng, 0, items.length - 1)];
}

function randomRegionType(rng: () => number): "whitehead" | "blackhead" | "papule" | "pustule" {
  return pickRandom(rng, ["whitehead", "blackhead", "papule", "pustule"]);
}

function createMockRegions(rng: () => number, severity: "mild" | "moderate" | "severe") {
  const countRange =
    severity === "mild" ? [6, 12] : severity === "moderate" ? [13, 22] : [23, 34];
  const count = randomInt(rng, countRange[0], countRange[1]);

  return Array.from({ length: count }, () => ({
    type: randomRegionType(rng),
    x: randomFloat(rng, 12, 88),
    y: randomFloat(rng, 10, 92),
    confidence: randomFloat(rng, 0.72, 0.98),
  }));
}

function buildMockAnalysisResult(base64Image: string, datasetSeed?: string | null): AnalysisResult {
  const rng = createSeededRandom(buildImageSeed(base64Image, datasetSeed));
  const profile = pickRandom(rng, MOCK_PROFILES);
  const cleanserPool = [
    {
      productName: "Gentle Foaming Cleanser",
      description: "Removes oil and residue without stripping the skin barrier.",
      ingredients: ["Glycerin", "Ceramides"],
      howToUse: "Use morning and night for 30-45 seconds, then rinse with lukewarm water.",
    },
    {
      productName: "Micro-Gel Purifying Cleanser",
      description: "Light gel wash that helps decongest pores and calm surface buildup.",
      ingredients: ["Betaine", "Green tea extract"],
      howToUse: "Massage into damp skin for 30 seconds and rinse; avoid hot water.",
    },
    {
      productName: "pH Balance Acne Cleanser",
      description: "Supports daily cleansing for acne-prone skin with minimal irritation.",
      ingredients: ["Panthenol", "Amino acids"],
      howToUse: "Cleanse twice daily and pat dry with a soft towel.",
    },
  ];

  const treatmentPoolMildModerate = [
    {
      productName: "Salicylic Acid Target Treatment",
      description: "Targets active lesions and supports pore turnover for acne control.",
      ingredients: ["Salicylic acid", "Niacinamide"],
      howToUse: "Apply a thin layer at night; start 3x weekly and increase as tolerated.",
    },
    {
      productName: "Azelaic Clarifying Gel",
      description: "Helps reduce redness and mild breakouts while improving skin tone.",
      ingredients: ["Azelaic acid", "Zinc PCA"],
      howToUse: "Apply a pea-sized amount nightly after cleansing.",
    },
    {
      productName: "Niacinamide Blemish Control Serum",
      description: "Supports oil balance and reduces visible acne inflammation.",
      ingredients: ["Niacinamide", "N-acetyl glucosamine"],
      howToUse: "Use once daily after cleansing, then follow with moisturizer.",
    },
  ];

  const treatmentPoolSevere = [
    {
      productName: "Benzoyl Peroxide + Retinoid Plan",
      description: "Targets deep inflammatory lesions and supports controlled cell turnover.",
      ingredients: ["Benzoyl peroxide", "Adapalene"],
      howToUse: "Apply a thin layer nightly; use moisturizer to reduce irritation.",
    },
    {
      productName: "Advanced Inflammation Control Treatment",
      description: "Designed for dense inflammatory acne with high recurrence risk.",
      ingredients: ["Benzoyl peroxide", "Clindamycin (Rx)"],
      howToUse: "Use as directed by a dermatologist; usually once daily in the evening.",
    },
  ];

  const moisturizerPool = [
    {
      productName: "Barrier Repair Moisturizer",
      description: "Improves hydration and helps reduce irritation from active ingredients.",
      ingredients: ["Hyaluronic acid", "Panthenol", "Ceramides"],
      howToUse: "Apply after treatment both morning and evening.",
    },
    {
      productName: "Oil-Free Recovery Moisturizer",
      description: "Provides lightweight moisture without clogging pores.",
      ingredients: ["Squalane", "Allantoin", "Glycerin"],
      howToUse: "Apply 1-2 pumps after treatment and before sunscreen.",
    },
    {
      productName: "Calming Gel Moisturizer",
      description: "Soothes redness and supports barrier recovery in acne-prone skin.",
      ingredients: ["Centella asiatica", "Ceramides", "Beta-glucan"],
      howToUse: "Use morning and evening on clean skin.",
    },
  ];

  const sunscreenPool = [
    {
      productName: "Broad Spectrum SPF 50 Gel",
      description: "Protects acne-prone skin from UV-driven inflammation and dark marks.",
      ingredients: ["Zinc oxide", "Titanium dioxide"],
      howToUse: "Apply every morning and reapply every 2-3 hours when outdoors.",
    },
    {
      productName: "Matte Fluid SPF 50+",
      description: "Lightweight, non-greasy UV protection suitable for oily skin.",
      ingredients: ["Uvinul A Plus", "Tinosorb S"],
      howToUse: "Apply generously as the final morning step; reapply midday.",
    },
    {
      productName: "Clear Shield SPF 45",
      description: "Daily sunscreen that helps prevent post-acne pigmentation.",
      ingredients: ["Zinc oxide", "Niacinamide"],
      howToUse: "Apply to full face 15 minutes before sun exposure.",
    },
  ];

  const recommendations: AnalysisResult["recommendations"] = [
    { category: "cleanser", ...pickRandom(rng, cleanserPool) },
    {
      category: "treatment",
      ...pickRandom(rng, profile.severity === "severe" ? treatmentPoolSevere : treatmentPoolMildModerate),
    },
    { category: "moisturizer", ...pickRandom(rng, moisturizerPool) },
    { category: "sunscreen", ...pickRandom(rng, sunscreenPool) },
  ];

  return {
    regions: createMockRegions(rng, profile.severity),
    severity: profile.severity,
    score: randomInt(rng, profile.scoreRange[0], profile.scoreRange[1]),
    summary: profile.summary,
    acneType: profile.acneType,
    percentage: randomInt(rng, profile.percentageRange[0], profile.percentageRange[1]),
    problem: profile.problem,
    requirements: [...profile.requirements],
    recommendations,
    dermatologyInsights: {
      triggers: [...profile.triggers],
      lifestyleTips: [...profile.lifestyleTips],
      clinicalAdvice: profile.clinicalAdvice,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toString(item))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|,|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeAnalysisResult(raw: any): AnalysisResult {
  const payload = raw?.analysis ?? raw?.result ?? raw?.data ?? raw ?? {};
  const acneType =
    toString(payload.acneType) ||
    toString(payload.acne_type) ||
    toString(payload.acneCategory) ||
    "General Acne";
  const percentage = clamp(
    toNumber(
      payload.percentage ??
        payload.coverage ??
        payload.coveragePercentage ??
        payload.involvementPercentage,
      0
    ),
    0,
    100
  );
  const score = clamp(
    toNumber(
      payload.score ??
        payload.severityScore ??
        payload.acneScore ??
        payload.riskScore,
      0
    ),
    0,
    100
  );

  const requirementSource =
    payload.requirements ??
    payload.skinNeeds ??
    payload.immediateNeeds ??
    payload.recommendedNeeds;
  const requirements = toStringArray(requirementSource);

  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations
        .filter(Boolean)
        .map((rec: any) => ({
          category: toString(rec?.category, "treatment") as "cleanser" | "treatment" | "moisturizer" | "sunscreen",
          productName: toString(rec?.productName ?? rec?.name, "Recommended product"),
          description: toString(rec?.description, "Follow dermatologist guidance for active acne."),
          ingredients: toStringArray(rec?.ingredients),
          howToUse: toString(rec?.howToUse ?? rec?.usage, "Use as directed and patch test first."),
        }))
    : [];

  const triggers = Array.isArray(payload?.dermatologyInsights?.triggers)
    ? payload.dermatologyInsights.triggers
        .filter(Boolean)
        .map((item: any) => ({
          title: toString(item?.title, "Potential trigger"),
          description: toString(item?.description, "Monitor for recurring flare patterns."),
        }))
    : [];

  const lifestyleTips = toStringArray(
    payload?.dermatologyInsights?.lifestyleTips ?? payload?.lifestyleTips
  );

  return {
    regions: Array.isArray(payload.regions)
      ? payload.regions
          .filter(Boolean)
          .map((region: any) => ({
            type: toString(region?.type, "papule") as "whitehead" | "blackhead" | "papule" | "pustule",
            x: clamp(toNumber(region?.x, 50), 0, 100),
            y: clamp(toNumber(region?.y, 50), 0, 100),
            confidence: clamp(toNumber(region?.confidence, 0.8), 0, 1),
          }))
      : [],
    severity: (toString(payload.severity, "moderate") as "mild" | "moderate" | "severe"),
    score,
    summary:
      toString(payload.summary) ||
      toString(payload.overview) ||
      "Analysis complete. Review routine and insights for next steps.",
    acneType,
    percentage,
    problem:
      toString(payload.problem) ||
      toString(payload.primaryIssue) ||
      "Active acne lesions with mild-to-moderate inflammation.",
    requirements:
      requirements.length > 0
        ? requirements
        : [
            "Gentle cleansing twice daily",
            "Non-comedogenic hydration",
            "Consistent sun protection",
          ],
    recommendations:
      recommendations.length > 0
        ? recommendations
        : [
            {
              category: "cleanser",
              productName: "Gentle pH-balanced Cleanser",
              description: "Helps remove excess oil without stripping the skin barrier.",
              ingredients: ["glycerin", "ceramides"],
              howToUse: "Use morning and night; rinse with lukewarm water.",
            },
          ],
    dermatologyInsights: {
      triggers:
        triggers.length > 0
          ? triggers
          : [
              {
                title: "Possible trigger pattern",
                description: "Stress, inconsistent sleep, and occlusive products may worsen breakouts.",
              },
            ],
      lifestyleTips:
        lifestyleTips.length > 0
          ? lifestyleTips
          : [
              "Maintain consistent sleep and hydration.",
              "Avoid picking lesions to reduce irritation and scarring risk.",
            ],
      clinicalAdvice:
        toString(payload?.dermatologyInsights?.clinicalAdvice) ||
        toString(payload?.clinicalAdvice) ||
        "If acne persists beyond 8-12 weeks, consult a dermatologist for a targeted treatment plan.",
    },
  };
}

export async function analyzeAcne(
  base64Image: string,
  options?: { datasetSeed?: string | null }
): Promise<AnalysisResult> {
  const datasetSeed = options?.datasetSeed ?? null;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API key missing. Returning mock sample analysis.");
    return buildMockAnalysisResult(base64Image, datasetSeed);
  }

  if (apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.includes("YOUR_")) {
    console.warn("Gemini API key placeholder detected. Returning mock sample analysis.");
    return buildMockAnalysisResult(base64Image, datasetSeed);
  }

  console.log("🔄 Starting acne analysis with Gemini 2.0 Flash...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            {
              text: `Analyze this facial image for acne. 
              1. Identify regions with acne and classify them as 'whitehead', 'blackhead', 'papule', or 'pustule'. 
              2. Provide coordinates (x, y as percentages 0-100) for each detected region.
              3. Determine the overall severity level ('mild', 'moderate', 'severe') and a numerical score (0-100).
              4. Provide a summary of the skin condition.
              5. Provide 'acneType' (e.g., 'Inflammatory Acne', 'Comedonal Acne'), 'percentage' (estimated coverage), 'problem' (a concise description of the primary issue), and 'requirements' (a list of immediate skin needs).
              6. Recommend a skincare routine with specific product types (cleanser, treatment, moisturizer, sunscreen), key ingredients, and 'howToUse' instructions for each.
              7. Provide 'dermatologyInsights' including 'triggers' (an array of objects with 'title' and 'description'), 'lifestyleTips' (diet, sleep, hygiene), and professional clinical advice.
              
              Return the result in strict JSON format.`,
            },
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            regions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['whitehead', 'blackhead', 'papule', 'pustule'] },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  confidence: { type: Type.NUMBER },
                },
                required: ['type', 'x', 'y'],
              },
            },
            severity: { type: Type.STRING, enum: ['mild', 'moderate', 'severe'] },
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            acneType: { type: Type.STRING },
            percentage: { type: Type.NUMBER },
            problem: { type: Type.STRING },
            requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ['cleanser', 'treatment', 'moisturizer', 'sunscreen'] },
                  productName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                  howToUse: { type: Type.STRING },
                },
                required: ['category', 'productName', 'description', 'ingredients', 'howToUse'],
              },
            },
            dermatologyInsights: {
              type: Type.OBJECT,
              properties: {
                triggers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ['title', 'description'],
                  },
                },
                lifestyleTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                clinicalAdvice: { type: Type.STRING },
              },
              required: ['triggers', 'lifestyleTips', 'clinicalAdvice'],
            },
          },
          required: ['regions', 'severity', 'score', 'summary', 'acneType', 'percentage', 'problem', 'requirements', 'recommendations', 'dermatologyInsights'],
        },
      },
    });

    if (!response || !response.text) {
      throw new Error("❌ Empty response from Gemini API. Please try again.");
    }

    console.log("✅ API Response received. Parsing...");
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(response.text);
      console.log("✅ JSON parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("Raw response:", response.text);
      throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    return normalizeAnalysisResult(parsed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Gemini API Error:", errorMessage);
    
    if (errorMessage.includes("API key")) {
      throw new Error(errorMessage);
    }
    
    if (errorMessage.includes("Invalid")) {
      throw new Error(errorMessage);
    }

    if (errorMessage.includes("JSON Parse")) {
      throw new Error(errorMessage);
    }

    const normalizedError = errorMessage.toLowerCase();
    if (
      normalizedError.includes("quota exceeded") ||
      normalizedError.includes("resource_exhausted") ||
      normalizedError.includes("\"code\":429") ||
      normalizedError.includes("status\":\"resource_exhausted")
    ) {
      console.warn("Gemini quota exceeded. Returning mock sample analysis.");
      return buildMockAnalysisResult(base64Image, datasetSeed);
    }
    
    throw new Error(`Analysis failed: ${errorMessage}. Please try again.`);
  }
}

