import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Atom,
  Beaker,
  BookOpen,
  Brain,
  ChevronRight,
  CloudRain,
  FlaskConical,
  Gauge,
  Globe2,
  Info,
  Microscope,
  Play,
  RefreshCcw,
  Scale,
  ShieldAlert,
  Snowflake,
  ThermometerSnowflake,
  Wheat,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TargetChoice = 'none' | 'moderate' | 'aggressive' | 'emergency';
type ParticleChoice = 'sulfate' | 'caco3' | 'alumina' | 'future';
type SeasonChoice = 'annual' | 'spring' | 'autumn';
type LocationChoice = 'tropical' | 'subtropical' | 'polar';
type ResearchChoice = 'none' | 'lab' | 'monitoring' | 'adaptation';

type Indicators = {
  temperature: number;
  ice: number;
  food: number;
  rain: number;
  trust: number;
  knowledge: number;
  aerosolBurden: number;
  infrastructure: number;
};

type HistoryPoint = Indicators & {
  year: number;
  withoutSAI: number;
};

type StrategyEntry = {
  year: number;
  particle: ParticleChoice;
  target: TargetChoice;
  season: SeasonChoice;
  location: LocationChoice;
  research: ResearchChoice;
  cost: number;
  event: string;
};

type Report = {
  year: number;
  title: string;
  text: string;
  event: string;
  previous: Indicators;
  current: Indicators;
  cost: number;
  choices: StrategyEntry;
};

const START_YEAR = 2030;
const END_YEAR = 2130;
const POINTS_PER_DECADE = 6;

const INITIAL_STATE: Indicators = {
  temperature: 1.6,
  ice: 70,
  food: 80,
  rain: 85,
  trust: 65,
  knowledge: 20,
  aerosolBurden: 0,
  infrastructure: 90,
};

const targetMeta: Record<TargetChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No SAI / pause', cost: 0, short: 'Avoids aerosol side effects, but background warming continues.' },
  moderate: { label: 'Stabilize near 1.5°C', cost: 2, short: 'Balanced climate control with moderate side effects.' },
  aggressive: { label: 'Aggressive cooling near 1.0°C', cost: 4, short: 'Reduces heat stress, but raises hydrological and agricultural risk.' },
  emergency: { label: 'Emergency cooling near 0.8°C', cost: 5, short: 'Crisis intervention with high overcooling, rainfall and trust risk.' },
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; risk: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known risks',
    risk: 'Most studied material, but linked to stratospheric heating, ozone chemistry and deposition concerns.',
  },
  caco3: {
    label: 'CaCO₃ / calcite particles',
    short: 'Partly known solid alternative',
    cost: 2,
    known: 'Partly known cooling, partly known lifetime, partly known risks',
    risk: 'Potentially useful alternative; acid uptake, ageing and heterogeneous chemistry remain uncertain.',
  },
  alumina: {
    label: 'Alumina particles',
    short: 'High-performance but ozone-uncertain',
    cost: 3,
    known: 'Promising optical behaviour, uncertain surface chemistry',
    risk: 'Can reduce some sulfate limitations, but chlorine activation and ozone loss are highly uncertain.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Locked high-uncertainty material',
    cost: 4,
    known: 'Unknown cooling, unknown lifetime, unknown risk',
    risk: 'High reward only if research is high. Low knowledge creates large chemistry, rainfall and trust penalties.',
  },
};

const seasonMeta: Record<SeasonChoice, { label: string; cost: number; short: string }> = {
  annual: { label: 'Annual injection', cost: 0, short: 'Reference strategy; predictable but not regionally optimal.' },
  spring: { label: 'Spring injection', cost: 1, short: 'More efficient cooling, but higher rainfall-trade-off risk in the game.' },
  autumn: { label: 'Autumn injection', cost: 1, short: 'Better ice and India-rainfall trade-off in the seasonal paper.' },
};

const locationMeta: Record<LocationChoice, { label: string; cost: number; short: string }> = {
  tropical: { label: 'Tropical / equatorial injection', cost: 0, short: 'More global spread, but weaker polar rescue.' },
  subtropical: { label: 'Subtropical injection', cost: 1, short: 'Middle strategy between global control and polar targeting.' },
  polar: { label: 'Polar injection', cost: 2, short: 'Strong ice protection, but high rainfall-inequality and governance risk.' },
};

const researchMeta: Record<ResearchChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No support action', cost: 0, short: 'Saves points, but uncertainty and social vulnerability remain.' },
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises knowledge; needed for alternative materials.' },
  monitoring: { label: 'Monitoring and open data', cost: 2, short: 'Raises trust, lowers event risk and improves infrastructure.' },
  adaptation: { label: 'Adaptation and compensation', cost: 2, short: 'Protects food/rain/trust when some regions are harmed.' },
};

const sourceThemes = [
  {
    title: 'Visioni et al. (2020) — seasonally modulated SAI',
    detail: 'Basis for Level 2. Seasonal injection can reach similar global objectives while changing regional outcomes such as India precipitation, Amazon dry-season rainfall and Arctic sea ice.',
  },
  {
    title: 'Cohen et al. (2025) — regional SAI case study',
    detail: 'Basis for heat, food and regional-impact indicators. SAI can reduce heat extremes and improve some wet-season precipitation, soil moisture and crop outcomes compared with climate change.',
  },
  {
    title: 'Duffey et al. (2023) — polar geoengineering review',
    detail: 'Basis for Level 3. Polar SAI can target ice but is not purely local and can create lower-latitude rainfall problems.',
  },
  {
    title: 'Vattioni et al. (2025) — solid alumina/calcite particles',
    detail: 'Basis for Level 4. Solid particles may avoid some sulfate limitations, but the authors emphasize large microphysical and chemical uncertainty.',
  },
  {
    title: 'Vattioni et al. (2023) — alumina and ozone uncertainty',
    detail: 'Basis for alumina risk. Alumina surface chemistry is poorly constrained and modeled ozone impacts depend strongly on uncertain reaction assumptions.',
  },
  {
    title: 'Proctor et al. (2018) — agriculture and volcanic aerosols',
    detail: 'Basis for the food/sunlight penalty. Stratospheric aerosols can cool the surface, but reduced direct sunlight can negatively affect crop yields.',
  },
  {
    title: 'Simpson et al. (2019) — hydroclimate and stratospheric heating',
    detail: 'Basis for aerosol-burden and rainfall penalties. Sulfate aerosols can heat the stratosphere and affect circulation and hydrology.',
  },
  {
    title: 'Haywood et al. (2013) — asymmetric forcing and Sahel rainfall',
    detail: 'Basis for regional inequality events. Hemispherically asymmetric aerosol loading can create strong rainfall differences, including Sahel drought risk.',
  },
  {
    title: 'Parker & Irvine (2018) — termination shock',
    detail: 'Basis for the interruption rule. Sudden termination after SAI can cause very rapid warming, giving natural and human systems less time to adapt.',
  },
  {
    title: 'Tracy et al. (2022) and Fu et al. (2025) — health/ecosystems and drought inequality',
    detail: 'Basis for harder random events and trust loss. SAI may affect public health, ecosystems, water, agriculture and unequal drought exposure.',
  },
];

const researchNeeded = {
  laboratory: ['aerosol generator', 'particle synthesis reactor', 'particle sizing (SMPS)', 'coagulation chamber', 'surface chemistry reactor'],
  measurements: ['particle size distribution', 'optical scattering', 'agglomeration behaviour', 'settling velocity', 'ozone-relevant surface reactions'],
  models: ['atmospheric transport model', 'aerosol microphysics model', 'climate model', 'crop / food-security impact model'],
};

const exactRules = [
  { option: 'Moderate target', effect: 'Temp → 1.5°C; food -1; rain -3; trust +1; burden +7; infrastructure -2' },
  { option: 'Aggressive target', effect: 'Temp → 1.0°C; food +2 then sunlight penalty -5; rain -11; trust -6; burden +15; infrastructure -5' },
  { option: 'Emergency target', effect: 'Temp → 0.8°C; food -9 then sunlight penalty -12; rain -20; trust -12; burden +22; infrastructure -8' },
  { option: 'No SAI', effect: 'Temp follows background warming; ice/food/rain decline; burden decays by 12; sudden stop can trigger termination shock' },
  { option: 'Annual season', effect: 'Ice +2; burden +2' },
  { option: 'Spring season', effect: 'Temp -0.05°C; rain -9; ice -4; trust -3; burden -1' },
  { option: 'Autumn season', effect: 'Ice +12; rain +1; trust +1; burden -1' },
  { option: 'Tropical location', effect: 'Ice -4; rain -2' },
  { option: 'Subtropical location', effect: 'Temp -0.05°C; ice +4; rain -4; food -1; burden +1' },
  { option: 'Polar location', effect: 'Ice +18; rain -18; food -10; trust -8; burden +4; infrastructure -3' },
  { option: 'Sulfate', effect: 'Knowledge +1; rain -2; trust -1; burden +4' },
  { option: 'CaCO₃ / calcite', effect: 'Knowledge +3; food +1; trust -4 if knowledge <50, otherwise -2; burden +5' },
  { option: 'Alumina', effect: 'Temp -0.05°C; knowledge +4; rain -1; trust -7 if knowledge <65, otherwise -3; burden +6' },
  { option: 'Future particle', effect: 'Temp -0.10°C; knowledge +5; if knowledge ≤85: food -12, rain -10, trust -15, burden +9; if knowledge >85: food +6, rain +3, trust -4' },
  { option: 'Laboratory testing', effect: 'Knowledge +18; trust +4; burden -2; infrastructure +1' },
  { option: 'Monitoring', effect: 'Knowledge +9; trust +10; rain +2; food +2; burden -6; infrastructure +6; event risk -10%' },
  { option: 'Adaptation', effect: 'Trust +14; food +8; rain +4; infrastructure +3' },
  { option: 'Aerosol burden >35', effect: 'Rain -3; food -2; trust -2' },
  { option: 'Aerosol burden >55', effect: 'Additional rain -5; food -4; trust -5; infrastructure -4; event risk rises' },
  { option: 'Aerosol burden >75', effect: 'Additional rain -8; food -8; trust -8; infrastructure -8; event risk rises strongly' },
  { option: 'Same core strategy 3 times', effect: 'Rain -7; food -5; trust -6; burden +6' },
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function roundIndicators(next: Indicators): Indicators {
  return {
    temperature: Number(next.temperature.toFixed(2)),
    ice: Math.round(clamp(next.ice)),
    food: Math.round(clamp(next.food)),
    rain: Math.round(clamp(next.rain)),
    trust: Math.round(clamp(next.trust)),
    knowledge: Math.round(clamp(next.knowledge)),
    aerosolBurden: Math.round(clamp(next.aerosolBurden)),
    infrastructure: Math.round(clamp(next.infrastructure)),
  };
}

function baselineTemperature(year: number): number {
  return Number((1.6 + (year - START_YEAR) * 0.025).toFixed(2));
}

function targetTemperature(target: TargetChoice, withoutSAI: number): number {
  if (target === 'none') return withoutSAI;
  if (target === 'moderate') return 1.5;
  if (target === 'aggressive') return 1.0;
  return 0.8;
}

function computeCost(
  target: TargetChoice,
  particle: ParticleChoice,
  season: SeasonChoice,
  location: LocationChoice,
  research: ResearchChoice,
): number {
  let cost = targetMeta[target].cost;
  if (target !== 'none') cost += particleMeta[particle].cost;
  if (target !== 'none') cost += seasonMeta[season].cost;
  if (target !== 'none') cost += locationMeta[location].cost;
  cost += researchMeta[research].cost;
  return cost;
}

function applyBurdenPressure(next: Indicators): string[] {
  const notes: string[] = [];
  if (next.aerosolBurden > 35) {
    next.rain -= 3;
    next.food -= 2;
    next.trust -= 2;
    notes.push('Aerosol burden exceeded 35%: small rainfall, food and trust penalties were applied.');
  }
  if (next.aerosolBurden > 55) {
    next.rain -= 5;
    next.food -= 4;
    next.trust -= 5;
    next.infrastructure -= 4;
    notes.push('Aerosol burden exceeded 55%: stronger hydrological and governance penalties were applied.');
  }
  if (next.aerosolBurden > 75) {
    next.rain -= 8;
    next.food -= 8;
    next.trust -= 8;
    next.infrastructure -= 8;
    notes.push('Aerosol burden exceeded 75%: the system entered a high side-effect-pressure zone.');
  }
  return notes;
}

function calcEventChance(
  target: TargetChoice,
  particle: ParticleChoice,
  location: LocationChoice,
  research: ResearchChoice,
  indicators: Indicators,
): number {
  let chance = 0.10;
  chance += particle === 'future' ? 0.17 : particle === 'alumina' ? 0.12 : particle === 'caco3' ? 0.08 : 0.03;
  chance += target === 'emergency' ? 0.14 : target === 'aggressive' ? 0.08 : 0;
  chance += location === 'polar' ? 0.08 : 0;
  chance += indicators.aerosolBurden / 400;
  chance += indicators.infrastructure < 40 ? 0.10 : 0;
  chance -= research === 'monitoring' ? 0.10 : 0;
  chance -= research === 'lab' ? 0.02 : 0;
  return Math.max(0.05, Math.min(0.55, chance));
}

function earthStatus(indicators: Indicators): { label: string; detail: string; tone: string; ring: string; emoji: string } {
  if (indicators.trust < 20 || indicators.rain < 20 || indicators.food < 20 || indicators.infrastructure < 20 || indicators.aerosolBurden > 90) {
    return {
      label: 'Crisis Earth',
      detail: 'At least one human, governance or technical stability variable is in the collapse zone.',
      tone: 'from-red-950 via-slate-900 to-slate-950',
      ring: 'border-red-500 shadow-red-900/50',
      emoji: '⚠️',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Very Hot Earth',
      detail: 'Temperature control failed; heat pressure dominates the system.',
      tone: 'from-orange-900 via-red-950 to-slate-950',
      ring: 'border-orange-400 shadow-orange-900/50',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Cooling became too aggressive; sunlight, rainfall and agriculture risks increase.',
      tone: 'from-blue-950 via-cyan-950 to-slate-950',
      ring: 'border-cyan-300 shadow-cyan-900/50',
      emoji: '❄️',
    };
  }
  if (indicators.aerosolBurden > 65) {
    return {
      label: 'Strained Managed Earth',
      detail: 'Temperature is controlled, but cumulative aerosol side-effect pressure is high.',
      tone: 'from-amber-950 via-slate-900 to-slate-950',
      ring: 'border-amber-400 shadow-amber-900/50',
      emoji: '🌫️',
    };
  }
  return {
    label: 'Managed Earth',
    detail: 'Temperature is controlled, but regional trade-offs and uncertainty remain.',
    tone: 'from-emerald-950 via-blue-950 to-slate-950',
    ring: 'border-emerald-400 shadow-emerald-900/50',
    emoji: '🌍',
  };
}

function differenceText(key: keyof Indicators, current: number, previous: number): { text: string; className: string } {
  const diff = Number((current - previous).toFixed(key === 'temperature' ? 2 : 0));
  if (diff === 0) return { text: '±0', className: 'text-slate-400' };
  if (key === 'temperature') {
    return { text: `${diff > 0 ? '+' : ''}${diff.toFixed(2)}°C`, className: diff > 0 ? 'text-red-400' : 'text-cyan-400' };
  }
  if (key === 'aerosolBurden') {
    return { text: `${diff > 0 ? '+' : ''}${diff}%`, className: diff > 0 ? 'text-red-400' : 'text-emerald-400' };
  }
  return { text: `${diff > 0 ? '+' : ''}${diff}%`, className: diff > 0 ? 'text-emerald-400' : 'text-red-400' };
}

function strategyExplanation(entry: StrategyEntry): string[] {
  const notes: string[] = [];

  if (entry.target === 'none') {
    notes.push('No SAI avoids direct aerosol side effects, but background greenhouse-gas warming continues. If this follows repeated SAI use, the game checks for termination shock.');
  } else if (entry.target === 'moderate') {
    notes.push('Moderate cooling stabilizes temperature near 1.5°C. It is safer than aggressive cooling, but still adds aerosol burden and hydrological side effects.');
  } else if (entry.target === 'aggressive') {
    notes.push('Aggressive cooling strongly reduces heat stress, but the game now applies a food/sunlight penalty and stronger rainfall risk. This follows the agricultural literature showing that aerosols can reduce direct sunlight for crops.');
  } else {
    notes.push('Emergency cooling is a crisis option. It controls temperature fastest but strongly raises aerosol burden, overcooling risk, rainfall disruption and trust loss.');
  }

  if (entry.season === 'autumn') {
    notes.push('Autumn injection is treated as favourable for Arctic sea-ice recovery and less harmful for the Indian monsoon than spring in the seasonal-strategy paper.');
  } else if (entry.season === 'spring') {
    notes.push('Spring injection is treated as SO₂-efficient, but with stronger rainfall-trade-off risk in the simplified game model.');
  } else if (entry.target !== 'none') {
    notes.push('Annual injection is the reference strategy: predictable, but not optimal for every region.');
  }

  if (entry.location === 'polar') {
    notes.push('Polar injection strongly supports Arctic ice, but it increases rainfall-inequality and governance risk because SAI effects are not purely local.');
  } else if (entry.location === 'subtropical') {
    notes.push('Subtropical injection is a compromise between global spread and targeted polar cooling.');
  } else if (entry.target !== 'none') {
    notes.push('Tropical injection spreads aerosols more globally, but polar regions can remain undercooled compared with the global mean.');
  }

  if (entry.particle === 'sulfate') {
    notes.push('Sulfate is the best-studied baseline. It has lower uncertainty than alternatives, but still increases aerosol burden and known chemistry/heating concerns.');
  } else if (entry.particle === 'caco3') {
    notes.push('CaCO₃/calcite is the research-gap material: potentially useful, but acid uptake, particle ageing, lifetime and heterogeneous chemistry are only partly known.');
  } else if (entry.particle === 'alumina') {
    notes.push('Alumina represents a high-performance solid-particle option with strong ozone-chemistry uncertainty, so the game gives it higher technical cost and event risk.');
  } else {
    notes.push('The future engineered particle is intentionally uncertain. It is powerful only after enough research and dangerous if used too early.');
  }

  if (entry.research === 'lab') {
    notes.push('Laboratory testing raises knowledge because material choice is an aerosol-engineering problem: generation, sizing, coagulation, optical scattering, settling and surface chemistry.');
  } else if (entry.research === 'monitoring') {
    notes.push('Monitoring raises trust, improves infrastructure and reduces random-event probability because regional and chemical side effects must be observed.');
  } else if (entry.research === 'adaptation') {
    notes.push('Adaptation and compensation reduce human damage from rainfall and food-security impacts, but they do not reduce aerosol burden as much as monitoring.');
  } else {
    notes.push('No support action saves points, but leaves research, monitoring and social vulnerability unresolved.');
  }

  return notes;
}

function finalOutcomeExplanation(indicators: Indicators): string {
  if (indicators.trust < 20 || indicators.food < 20 || indicators.rain < 20 || indicators.infrastructure < 20) {
    return 'The end state is a governance or human-systems failure. The game shows that temperature control is not sufficient if rainfall, food security, public legitimacy or operational stability collapses.';
  }
  if (indicators.aerosolBurden > 80) {
    return 'The end state is technically unstable. Temperature may look controlled, but aerosol burden is too high, so side-effect pressure and random-event risk remain severe.';
  }
  if (indicators.temperature > 2.3) {
    return 'The end state is too hot. The intervention was too weak or too late to prevent strong warming, which harms ice, food security and long-term stability.';
  }
  if (indicators.temperature < 1.0) {
    return 'The end state is overcooled. The intervention controlled heat too aggressively, so reduced sunlight and altered rainfall can damage agriculture and trust.';
  }
  if (indicators.knowledge >= 70 && indicators.trust >= 50 && indicators.food >= 50 && indicators.rain >= 50 && indicators.ice >= 50 && indicators.infrastructure >= 50 && indicators.aerosolBurden <= 60) {
    return 'The end state is relatively stable. Temperature was controlled while regional indicators, trust, infrastructure and knowledge stayed outside the danger zone.';
  }
  return 'The end state is mixed. Temperature may be acceptable, but at least one regional, technical or governance indicator remains weak.';
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">{children}</div>;
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-950/60 px-3 py-1 text-sm text-blue-200">
                <Globe2 size={16} /> Interactive SAI governance game · harder research version
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">The SAI Governance Challenge</h1>
              <p className="mt-4 max-w-3xl text-slate-300 md:text-lg">
                You are the climate council from 2030 to 2130. Each decade, you decide whether and how to use stratospheric aerosol injection. The goal is not a perfect score. The goal is to understand why cooling, rainfall, agriculture, polar ice, public trust, infrastructure and aerosol material uncertainty must be governed together.
              </p>
            </div>
            <button
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
            >
              Start game <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-blue-400" /> Theory behind the game</h2>
            <p className="text-slate-300 leading-relaxed">
              SAI means stratospheric aerosol injection. Aerosol particles or precursors are introduced into the stratosphere to scatter incoming sunlight and reduce surface warming. This can lower global temperature, but it does not remove greenhouse gases and it cannot perfectly restore the climate system.
            </p>
            <p className="mt-3 text-slate-300 leading-relaxed">
              The harder version adds cumulative aerosol burden, infrastructure stability, material chemistry uncertainty, crop sunlight penalties and regional inequality events. These changes prevent one repeated strategy from becoming automatically perfect.
            </p>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Goal of the game</h2>
            <p className="text-slate-300 leading-relaxed">
              Survive ten decades until 2130 without triggering collapse. A good result keeps temperature near the target, Arctic ice above danger level, food and rainfall stable, public trust alive, scientific knowledge high, aerosol burden controlled and infrastructure stable.
            </p>
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
              You now get only {POINTS_PER_DECADE} Governance Points each decade. Strong SAI, polar targeting, new materials and research cannot all be chosen at the same time.
            </div>
          </InfoCard>
        </div>

        <InfoCard>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-emerald-400" /> Research papers and game functions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {sourceThemes.map((source) => (
              <div key={source.title} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="font-bold text-white">{source.title}</div>
                <div className="mt-1 text-sm text-slate-400">{source.detail}</div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard>
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><FlaskConical className="text-purple-400" /> Research gap: aerosol material choice</h2>
          <div className="rounded-xl border-l-4 border-purple-400 bg-purple-950/20 p-4 text-lg text-purple-100">
            Can alternative engineered nanoparticles outperform sulfate aerosols while reducing environmental side effects?
          </div>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Sulfate is the known baseline. CaCO₃/calcite and alumina are solid-particle alternatives, but their lifetime, optical behaviour, surface chemistry, ozone effects and particle ageing are uncertain. The future engineered particle is locked because unknown particles should not be deployed without research.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-slate-200">
                <tr><th className="p-3">Particle</th><th className="p-3">Cooling</th><th className="p-3">Lifetime</th><th className="p-3">Main game risk</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                <tr><td className="p-3">Sulfate</td><td className="p-3">Known</td><td className="p-3">Known</td><td className="p-3">Known chemistry / heating / deposition concerns</td></tr>
                <tr><td className="p-3">CaCO₃ / calcite</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Acid uptake, ageing, heterogeneous chemistry</td></tr>
                <tr><td className="p-3">Alumina</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Ozone chemistry uncertainty</td></tr>
                <tr><td className="p-3">Future particle</td><td className="p-3">???</td><td className="p-3">???</td><td className="p-3">Unknown risk until research is high</td></tr>
              </tbody>
            </table>
          </div>
        </InfoCard>

        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Microscope className="text-cyan-400" /> Laboratory</h3>
            <ul className="space-y-2 text-slate-300">{researchNeeded.laboratory.map((item) => <li key={item}>• {item}</li>)}</ul>
          </InfoCard>
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Activity className="text-emerald-400" /> Measurements</h3>
            <ul className="space-y-2 text-slate-300">{researchNeeded.measurements.map((item) => <li key={item}>• {item}</li>)}</ul>
          </InfoCard>
          <InfoCard>
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Brain className="text-purple-400" /> Models</h3>
            <ul className="space-y-2 text-slate-300">{researchNeeded.models.map((item) => <li key={item}>• {item}</li>)}</ul>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, tone, note }: { icon: React.ReactNode; title: string; value: string; tone: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center shadow-xl">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 ${tone}`}>{icon}</div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-1 font-mono text-2xl font-black text-white">{value}</div>
      {note && <div className="mt-1 text-[10px] text-slate-500">{note}</div>}
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  title,
  subtitle,
  cost,
  onClick,
  tone = 'blue',
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  cost: number;
  onClick: () => void;
  tone?: 'blue' | 'emerald' | 'red' | 'purple' | 'amber';
}) {
  const selectedClass = {
    blue: 'border-blue-500 bg-blue-950/40',
    emerald: 'border-emerald-500 bg-emerald-950/40',
    red: 'border-red-500 bg-red-950/40',
    purple: 'border-purple-500 bg-purple-950/40',
    amber: 'border-amber-500 bg-amber-950/40',
  }[tone];
  const titleClass = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    purple: 'text-purple-300',
    amber: 'text-amber-300',
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${selected ? selectedClass : 'border-slate-700 bg-slate-800 hover:border-slate-500'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-bold ${titleClass}`}>{title}</div>
          <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">{cost} GP</div>
      </div>
    </button>
  );
}

function EarthVisual({ indicators }: { indicators: Indicators }) {
  const status = earthStatus(indicators);
  return (
    <div className={`rounded-3xl border border-slate-800 bg-gradient-to-br ${status.tone} p-5 shadow-xl`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className={`flex h-28 w-28 items-center justify-center rounded-full border-4 text-5xl shadow-2xl ${status.ring}`}>
            <span>{status.emoji}</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{status.label}</div>
            <div className="mt-1 max-w-md text-sm text-slate-300">{status.detail}</div>
            <div className="mt-3 text-xs text-slate-500">Visual status based on temperature, food, rainfall, trust, aerosol burden and infrastructure.</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
          <div className="font-bold text-white">Harder version rule</div>
          <div className="mt-1">A perfect temperature number can still fail if burden, infrastructure, rainfall or trust becomes unstable.</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [introOpen, setIntroOpen] = useState(true);
  const [year, setYear] = useState(START_YEAR);
  const [indicators, setIndicators] = useState<Indicators>(INITIAL_STATE);
  const [history, setHistory] = useState<HistoryPoint[]>([
    { year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature },
  ]);
  const [target, setTarget] = useState<TargetChoice>('moderate');
  const [particle, setParticle] = useState<ParticleChoice>('sulfate');
  const [season, setSeason] = useState<SeasonChoice>('annual');
  const [location, setLocation] = useState<LocationChoice>('tropical');
  const [research, setResearch] = useState<ResearchChoice>('none');
  const [strategyLog, setStrategyLog] = useState<StrategyEntry[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [terminationShock, setTerminationShock] = useState(false);
  const [pointPenalty, setPointPenalty] = useState(0);

  const availablePoints = Math.max(3, POINTS_PER_DECADE - pointPenalty);
  const futureUnlocked = indicators.knowledge >= 70 && year >= 2080;
  const emergencyUnlocked = year >= 2070 || indicators.temperature >= 2.3;
  const currentCost = computeCost(target, particle, season, location, research);
  const pointsRemaining = availablePoints - currentCost;

  const repeatedPolar = useMemo(() => strategyLog.filter((entry) => entry.location === 'polar').length, [strategyLog]);
  const activeSAIDecades = useMemo(() => strategyLog.filter((entry) => entry.target !== 'none').length, [strategyLog]);
  const lastTwoSameCore = useMemo(() => {
    if (strategyLog.length < 2) return false;
    const lastTwo = strategyLog.slice(-2);
    return lastTwo.every(
      (entry) => entry.target === target && entry.particle === particle && entry.season === season && entry.location === location,
    );
  }, [strategyLog, target, particle, season, location]);

  const processDecade = () => {
    if (currentCost > availablePoints) return;

    const previousTarget = strategyLog[strategyLog.length - 1]?.target ?? 'none';
    if (target === 'none' && previousTarget !== 'none' && activeSAIDecades >= 2) {
      setTerminationShock(true);
      setGameOver(true);
      return;
    }

    if (particle === 'future' && !futureUnlocked) return;
    if (target === 'emergency' && !emergencyUnlocked) return;

    const nextYear = year + 10;
    const withoutSAI = baselineTemperature(nextYear);
    const previous = indicators;
    let next: Indicators = { ...indicators };
    let event = '';
    let reportTitle = 'Decade completed';
    let reportText = 'The climate system responded to your decisions. The effects are simplified scoring rules based on research trends, not exact climate-model output.';
    const burdenNotes: string[] = [];

    if (target === 'none') {
      next.temperature = withoutSAI;
      next.ice -= 10 + Math.max(0, withoutSAI - 2) * 7;
      next.food -= 6 + Math.max(0, withoutSAI - 2) * 5;
      next.rain -= 4;
      next.trust += 2;
      next.aerosolBurden -= 12;
      next.infrastructure += 1;
      reportText = 'You avoided direct aerosol side effects this decade, but background warming continued.';
    } else {
      let desiredTemp = targetTemperature(target, withoutSAI);

      if (particle === 'caco3') desiredTemp -= 0.05;
      if (particle === 'alumina') desiredTemp -= 0.05;
      if (particle === 'future') desiredTemp -= 0.1;
      if (season === 'spring') desiredTemp -= 0.05;
      if (location === 'subtropical') desiredTemp -= 0.05;
      if (indicators.aerosolBurden > 70) desiredTemp += 0.1;

      next.temperature = Math.max(0.4, desiredTemp);

      if (target === 'moderate') {
        next.food -= 1;
        next.rain -= 3;
        next.trust += 1;
        next.aerosolBurden += 7;
        next.infrastructure -= 2;
      }
      if (target === 'aggressive') {
        next.food += 2;
        next.rain -= 11;
        next.trust -= 6;
        next.aerosolBurden += 15;
        next.infrastructure -= 5;
        next.food -= 5;
        burdenNotes.push('Food sunlight penalty: aggressive aerosol loading reduced direct sunlight for crops.');
      }
      if (target === 'emergency') {
        next.food -= 9;
        next.rain -= 20;
        next.trust -= 12;
        next.aerosolBurden += 22;
        next.infrastructure -= 8;
        next.food -= 12;
        burdenNotes.push('Strong sunlight/overcooling penalty: emergency cooling damaged agricultural stability.');
      }

      if (particle === 'sulfate') {
        next.knowledge += 1;
        next.trust -= 1;
        next.rain -= 2;
        next.aerosolBurden += 4;
      }
      if (particle === 'caco3') {
        next.knowledge += 3;
        next.trust -= indicators.knowledge < 50 ? 4 : 2;
        next.food += 1;
        next.aerosolBurden += 5;
      }
      if (particle === 'alumina') {
        next.knowledge += 4;
        next.trust -= indicators.knowledge < 65 ? 7 : 3;
        next.rain -= 1;
        next.aerosolBurden += 6;
      }
      if (particle === 'future') {
        next.knowledge += 5;
        next.trust -= indicators.knowledge > 85 ? 4 : 15;
        next.food += indicators.knowledge > 85 ? 6 : -12;
        next.rain += indicators.knowledge > 85 ? 3 : -10;
        next.aerosolBurden += indicators.knowledge > 85 ? 5 : 9;
      }

      if (season === 'annual') {
        next.ice += 2;
        next.aerosolBurden += 2;
      }
      if (season === 'spring') {
        next.rain -= 9;
        next.ice -= 4;
        next.trust -= 3;
        next.aerosolBurden -= 1;
      }
      if (season === 'autumn') {
        next.ice += 12;
        next.rain += 1;
        next.trust += 1;
        next.aerosolBurden -= 1;
      }

      if (location === 'tropical') {
        next.ice -= 4;
        next.rain -= 2;
      }
      if (location === 'subtropical') {
        next.ice += 4;
        next.rain -= 4;
        next.food -= 1;
        next.aerosolBurden += 1;
      }
      if (location === 'polar') {
        next.ice += 18;
        next.rain -= 18;
        next.food -= 10;
        next.trust -= 8;
        next.aerosolBurden += 4;
        next.infrastructure -= 3;
      }
    }

    if (research === 'lab') {
      next.knowledge += 18;
      next.trust += 4;
      next.aerosolBurden -= 2;
      next.infrastructure += 1;
      reportText = 'Laboratory work improved knowledge about particles, but it used governance resources that could not be spent elsewhere.';
    }
    if (research === 'monitoring') {
      next.knowledge += 9;
      next.trust += 10;
      next.rain += 2;
      next.food += 2;
      next.aerosolBurden -= 6;
      next.infrastructure += 6;
      reportText = 'Monitoring improved transparency, infrastructure and early-warning capacity. This lowered uncertainty and event risk.';
    }
    if (research === 'adaptation') {
      next.trust += 14;
      next.food += 8;
      next.rain += 4;
      next.infrastructure += 3;
      reportText = 'Adaptation and compensation reduced human damage in regions affected by side effects.';
    }

    if (lastTwoSameCore) {
      next.rain -= 7;
      next.food -= 5;
      next.trust -= 6;
      next.aerosolBurden += 6;
      event = 'Strategy lock-in: the same core intervention was used three decades in a row. Diminishing returns and regional opposition increased.';
      reportTitle = 'Warning: diminishing returns';
    }

    burdenNotes.push(...applyBurdenPressure(next));

    let eventChance = calcEventChance(target, particle, location, research, next);
    if (repeatedPolar >= 2) eventChance += 0.08;
    if (next.rain < 50) eventChance += 0.06;
    eventChance = Math.max(0.05, Math.min(0.60, eventChance));

    if (Math.random() < eventChance) {
      const eventRoll = Math.random();
      if (target !== 'none' && next.infrastructure < 25 && activeSAIDecades >= 2 && eventRoll < 0.25) {
        setTerminationShock(true);
        setGameOver(true);
        return;
      }
      if ((particle === 'alumina' || particle === 'caco3' || particle === 'future') && eventRoll < 0.30) {
        next.knowledge += 7;
        next.trust -= 16;
        next.rain -= 6;
        next.food -= 6;
        event = 'Material chemistry surprise: laboratory assumptions did not transfer cleanly to stratospheric conditions. Knowledge increased, but ozone/chemistry concerns damaged trust.';
        reportTitle = 'Extreme event: material chemistry';
      } else if ((location === 'polar' || repeatedPolar >= 2 || next.rain < 55) && eventRoll < 0.60) {
        next.rain -= 18;
        next.food -= 12;
        next.trust -= 15;
        event = 'Regional drought inequality: the global temperature target looked acceptable, but rainfall losses were concentrated in vulnerable regions.';
        reportTitle = 'Extreme event: regional inequality';
      } else if (target !== 'none' && eventRoll < 0.82) {
        next.temperature -= 0.25;
        next.food -= 10;
        next.rain -= 8;
        next.trust -= 4;
        event = 'Volcanic overcooling shock: natural aerosols added extra cooling. Combined with SAI, this reduced sunlight and harmed agriculture.';
        reportTitle = 'Extreme event: overcooling shock';
      } else {
        next.food -= 6;
        next.rain -= 5;
        next.trust -= 10;
        event = 'Public health and ecosystem stress: side effects affected water, agriculture or ecosystem-health pathways, increasing public opposition.';
        reportTitle = 'Extreme event: health/ecosystem stress';
      }
    }

    if (next.rain < 25) {
      next.food -= 12;
      next.trust -= 10;
      event = event || 'Crisis feedback: rainfall stability fell below 25%. Food security and trust declined.';
    }
    if (next.food < 25) {
      next.trust -= 6;
      event = event || 'Crisis feedback: food security fell below 25%. Public trust declined.';
    }

    let nextPenalty = 0;
    if (next.trust < 25) nextPenalty += 2;
    if (next.infrastructure < 35) nextPenalty += 1;
    if (next.aerosolBurden > 75) nextPenalty += 1;
    setPointPenalty(Math.min(3, nextPenalty));

    if (burdenNotes.length > 0 && !event) {
      event = burdenNotes.join(' ');
      reportTitle = 'Warning: aerosol burden pressure';
    } else if (burdenNotes.length > 0 && event) {
      event += ' ' + burdenNotes.join(' ');
    }

    const rounded = roundIndicators(next);
    const entry: StrategyEntry = { year, particle, target, season, location, research, cost: currentCost, event };

    setIndicators(rounded);
    setHistory((prev) => [...prev, { year: nextYear, ...rounded, withoutSAI }]);
    setStrategyLog((prev) => [...prev, entry]);
    setYear(nextYear);
    setReport({ year: nextYear, title: reportTitle, text: reportText, event, previous, current: rounded, cost: currentCost, choices: entry });
  };

  const closeReport = () => {
    setReport(null);
    if (year >= END_YEAR) setGameOver(true);
  };

  const resetGame = () => {
    setIntroOpen(true);
    setYear(START_YEAR);
    setIndicators(INITIAL_STATE);
    setHistory([{ year: START_YEAR, ...INITIAL_STATE, withoutSAI: INITIAL_STATE.temperature }]);
    setTarget('moderate');
    setParticle('sulfate');
    setSeason('annual');
    setLocation('tropical');
    setResearch('none');
    setStrategyLog([]);
    setReport(null);
    setGameOver(false);
    setTerminationShock(false);
    setPointPenalty(0);
  };

  if (introOpen) return <IntroScreen onStart={() => setIntroOpen(false)} />;

  if (terminationShock) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl shadow-red-950/40">
          <AlertOctagon className="mx-auto mb-5 text-red-400" size={88} />
          <h1 className="text-5xl font-black text-white">Termination Shock</h1>
          <p className="mt-5 text-left text-lg leading-relaxed text-slate-300">
            The SAI program was interrupted or stopped suddenly after several decades of deployment. The aerosol layer disappears much faster than CO₂, so the masked warming appears rapidly. In this game, that is immediate collapse.
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-6 py-4 font-bold text-white hover:bg-red-600">
            <RefreshCcw size={18} /> Restart
          </button>
        </div>
      </div>
    );
  }

  const metricCards = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
      <MetricCard icon={<ThermometerSnowflake size={22} />} title="Temp." value={`+${indicators.temperature.toFixed(2)}°C`} tone={indicators.temperature > 2 ? 'text-red-400' : 'text-cyan-400'} />
      <MetricCard icon={<Snowflake size={22} />} title="Ice" value={`${indicators.ice}%`} tone={indicators.ice < 35 ? 'text-red-400' : 'text-blue-400'} />
      <MetricCard icon={<Wheat size={22} />} title="Food" value={`${indicators.food}%`} tone={indicators.food < 40 ? 'text-red-400' : 'text-amber-400'} />
      <MetricCard icon={<CloudRain size={22} />} title="Rain" value={`${indicators.rain}%`} tone={indicators.rain < 40 ? 'text-red-400' : 'text-cyan-400'} />
      <MetricCard icon={<Scale size={22} />} title="Trust" value={`${indicators.trust}%`} tone={indicators.trust < 40 ? 'text-red-400' : 'text-emerald-400'} />
      <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge < 50 ? 'text-amber-400' : 'text-purple-400'} />
      <MetricCard icon={<Gauge size={22} />} title="Burden" value={`${indicators.aerosolBurden}%`} tone={indicators.aerosolBurden > 65 ? 'text-red-400' : 'text-slate-300'} note="lower is better" />
      <MetricCard icon={<Wrench size={22} />} title="Infrastructure" value={`${indicators.infrastructure}%`} tone={indicators.infrastructure < 45 ? 'text-red-400' : 'text-emerald-400'} />
    </div>
  );

  if (gameOver) {
    const polarCount = strategyLog.filter((s) => s.location === 'polar').length;
    const futureCount = strategyLog.filter((s) => s.particle === 'future').length;
    const caco3Count = strategyLog.filter((s) => s.particle === 'caco3').length;
    const aluminaCount = strategyLog.filter((s) => s.particle === 'alumina').length;
    const labCount = strategyLog.filter((s) => s.research === 'lab' || s.research === 'monitoring').length;
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
            <h1 className="text-4xl font-black text-white">Final Evaluation: 2130</h1>
            <p className="mt-2 text-slate-400">The century-long climate intervention simulation is complete.</p>
          </div>
          <EarthVisual indicators={indicators} />
          {metricCards}
          <InfoCard>
            <h2 className="mb-3 text-2xl font-black text-white">Scientific interpretation</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-100">{finalOutcomeExplanation(indicators)}</div>
              <p>Temperature is only one success criterion. The final state also depends on aerosol burden, infrastructure stability, rainfall, food security, public trust and knowledge.</p>
              <p>You used polar injection {polarCount} time(s). Polar strategies strongly protect Arctic ice, but repeated use raises lower-latitude rainfall and regional inequality risk.</p>
              <p>You used CaCO₃/calcite {caco3Count} time(s), alumina {aluminaCount} time(s), and future engineered particles {futureCount} time(s). These choices represent the material research gap: alternative particles are promising only when uncertainty is actively reduced.</p>
              <p>You invested in laboratory or monitoring work {labCount} time(s). High knowledge and infrastructure make the strategy more defensible; low knowledge makes new materials and repeated high-burden SAI dangerous.</p>
            </div>
          </InfoCard>
          <InfoCard>
            <h2 className="mb-4 text-2xl font-black text-white">Strategy log</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-slate-400"><tr><th className="p-2">Decade</th><th className="p-2">Particle</th><th className="p-2">Target</th><th className="p-2">Season</th><th className="p-2">Location</th><th className="p-2">Support</th><th className="p-2">Cost</th><th className="p-2">Event</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {strategyLog.map((entry, idx) => (
                    <tr key={`${entry.year}-${idx}`}>
                      <td className="p-2">{entry.year}-{entry.year + 10}</td>
                      <td className="p-2">{particleMeta[entry.particle].label}</td>
                      <td className="p-2">{targetMeta[entry.target].label}</td>
                      <td className="p-2">{seasonMeta[entry.season].label}</td>
                      <td className="p-2">{locationMeta[entry.location].label}</td>
                      <td className="p-2">{researchMeta[entry.research].label}</td>
                      <td className="p-2">{entry.cost}</td>
                      <td className="p-2 text-slate-400">{entry.event || 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>
          <button onClick={resetGame} className="mx-auto flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500"><RefreshCcw size={18} /> Restart</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-200 font-sans">
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">{report.title}</h2>
                <p className="text-slate-400">Results after decade ending in {report.year}</p>
              </div>
              <button onClick={closeReport} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500">Continue</button>
            </div>
            <p className="mb-4 text-slate-300">{report.text}</p>
            {report.event && <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-100"><b>Event / warning:</b> {report.event}</div>}
            <div className="grid gap-3 md:grid-cols-4">
              {([
                ['temperature', 'Temperature'],
                ['ice', 'Arctic ice'],
                ['food', 'Food security'],
                ['rain', 'Rain stability'],
                ['trust', 'Trust'],
                ['knowledge', 'Knowledge'],
                ['aerosolBurden', 'Aerosol burden'],
                ['infrastructure', 'Infrastructure'],
              ] as [keyof Indicators, string][]).map(([key, label]) => {
                const diff = differenceText(key, report.current[key], report.previous[key]);
                const value = key === 'temperature' ? `+${report.current[key].toFixed(2)}°C` : `${report.current[key]}%`;
                return (
                  <div key={key} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-black text-white">{value}</div>
                    <div className={`text-sm font-bold ${diff.className}`}>{diff.text}</div>
                  </div>
                );
              })}
            </div>
            <InfoCard>
              <h3 className="mb-3 mt-2 text-xl font-black text-white">Why this happened</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {strategyExplanation(report.choices).map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </InfoCard>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">SAI Governance Challenge</h1>
            <p className="text-sm text-slate-400">Planning decade: {year} to {year + 10}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><b>Points:</b> {availablePoints}</div>
            <div className={`rounded-xl border px-3 py-2 ${pointsRemaining < 0 ? 'border-red-700 bg-red-950/40 text-red-200' : 'border-slate-700 bg-slate-950'}`}><b>Cost:</b> {currentCost} · <b>Remaining:</b> {pointsRemaining}</div>
            <button onClick={resetGame} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 hover:border-slate-500"><RefreshCcw size={16} /></button>
          </div>
        </div>

        <EarthVisual indicators={indicators} />
        {metricCards}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <InfoCard>
              <h2 className="mb-4 text-2xl font-black text-white">Decade decisions</h2>
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><ThermometerSnowflake size={16} /> Level 1: Temperature target</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={target === 'none'} title="No SAI / pause" subtitle="No aerosol side effects, but warming continues. Dangerous after previous SAI." cost={0} tone="amber" onClick={() => setTarget('none')} />
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle="Balanced intervention. Still adds aerosol burden." cost={targetMeta.moderate.cost + (target === 'moderate' ? particleMeta[particle].cost : 1)} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle="Reduces heat stress, but rainfall/sunlight risk rises." cost={targetMeta.aggressive.cost + particleMeta[particle].cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? 'Extreme action. High chance of overcooling and backlash.' : 'Locked until 2070 or severe warming.'} cost={targetMeta.emergency.cost + particleMeta[particle].cost} tone="red" onClick={() => setTarget('emergency')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Activity size={16} /> Level 2: Seasonality</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={season === 'annual'} title="Annual injection" subtitle="Reference strategy. Stable, but not regionally optimal." cost={target === 'none' ? 0 : 0} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} title="Spring injection" subtitle="Efficient cooling, but stronger rainfall trade-off." cost={target === 'none' ? 0 : 1} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} title="Autumn injection" subtitle="Better ice and India-rainfall trade-off." cost={target === 'none' ? 0 : 1} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection location</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={location === 'tropical'} title="Tropical / equatorial" subtitle="Global spread, weaker polar rescue." cost={target === 'none' ? 0 : 0} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} title="Subtropical" subtitle="Compromise: more control, more trade-offs." cost={target === 'none' ? 0 : 1} tone="blue" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} title="Polar" subtitle="Strong ice rescue, but rainfall inequality risk." cost={target === 'none' ? 0 : 2} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Particle material / research gap</h3>
                  <div className="mb-3 rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-100">The new version adds alumina and makes alternative materials risky unless knowledge is built first.</div>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle="Known baseline. Lower uncertainty, known risks." cost={target === 'none' ? 0 : particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle="Solid alternative. Partly known, chemistry uncertain." cost={target === 'none' ? 0 : particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'alumina'} title="Alumina particles" subtitle="Potential solid particle option, but ozone uncertainty is high." cost={target === 'none' ? 0 : particleMeta.alumina.cost} tone="amber" onClick={() => setParticle('alumina')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={futureUnlocked ? 'Unlocked by research. High reward, high uncertainty.' : 'Locked: needs ≥70% knowledge and year ≥2080.'} cost={target === 'none' ? 0 : particleMeta.future.cost} tone="red" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Optional support action</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No support action" subtitle="Save points, but uncertainty remains." cost={0} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing" subtitle="Research material performance and chemistry." cost={2} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data" subtitle="Lower event risk, improve trust and infrastructure." cost={2} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation" subtitle="Protect affected regions and food systems." cost={2} tone="amber" onClick={() => setResearch('adaptation')} />
                  </div>
                </section>
              </div>
              {pointsRemaining < 0 && <div className="mt-5 rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">Not enough Governance Points. Choose cheaper options.</div>}
              {lastTwoSameCore && <div className="mt-5 rounded-2xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">Warning: using the same core strategy again will trigger diminishing returns.</div>}
              <button onClick={processDecade} disabled={pointsRemaining < 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                <Play size={18} /> Complete decade
              </button>
            </InfoCard>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Research gap tracker</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800 text-slate-300"><tr><th className="p-3">Particle</th><th className="p-3">Cooling</th><th className="p-3">Lifetime</th><th className="p-3">Risk</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr><td className="p-3">Sulfate</td><td className="p-3">Known</td><td className="p-3">Known</td><td className="p-3">Known but not harmless</td></tr>
                    <tr><td className="p-3">CaCO₃ / calcite</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Acid uptake / ageing uncertainty</td></tr>
                    <tr><td className="p-3">Alumina</td><td className="p-3">Partly known</td><td className="p-3">Partly known</td><td className="p-3">Ozone chemistry uncertainty</td></tr>
                    <tr><td className="p-3">Future particle</td><td className="p-3">{futureUnlocked ? 'Research unlocked' : '???'}</td><td className="p-3">{futureUnlocked ? 'Partly modeled' : '???'}</td><td className="p-3">{futureUnlocked ? 'Still uncertain' : '???'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
                Current knowledge: {indicators.knowledge}%. Future particles unlock at 70% knowledge after 2080. The game now makes alternative particles useful only if the player also invests in research and monitoring.
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Temperature trajectory</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} ticks={[2030, 2050, 2070, 2090, 2110, 2130]} stroke="#64748b" />
                    <YAxis domain={[0, 4.2]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ value: '1.5°C', fill: '#10b981', fontSize: 10 }} />
                    <Line type="linear" dataKey="withoutSAI" name="Without SAI" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} legendType="plainline" />
                    <Line type="linear" dataKey="temperature" name="Actual temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} legendType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Regional and governance stability</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} ticks={[2030, 2050, 2070, 2090, 2110, 2130]} stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <Line type="linear" dataKey="ice" name="Arctic ice" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="food" name="Food security" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="rain" name="Rain/monsoon" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="trust" name="Public trust" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="knowledge" name="Knowledge" stroke="#e879f9" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Technical stability</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} ticks={[2030, 2050, 2070, 2090, 2110, 2130]} stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Burden penalty zone', fill: '#f59e0b', fontSize: 10 }} />
                    <Line type="linear" dataKey="aerosolBurden" name="Aerosol burden" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                    <Line type="linear" dataKey="infrastructure" name="Infrastructure" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} legendType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><ShieldAlert className="text-red-400" /> Harder outcome rules</h2>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Termination shock:</b> stopping or interrupting SAI after repeated deployment can end the game.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Aerosol burden:</b> high cumulative burden causes rainfall, food, trust and infrastructure penalties.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Diminishing returns:</b> using the same core strategy three times in a row triggers lock-in penalties.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Material chemistry:</b> CaCO₃, alumina and future particles can trigger surprise side effects if knowledge is too low.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Crop sunlight penalty:</b> aggressive aerosol loading can lower food security even if heat stress is reduced.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Regional inequality:</b> polar/asymmetric choices can trigger concentrated drought and trust collapse.</div>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><Info className="text-blue-400" /> Exact effect reference</h2>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-700">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="sticky top-0 bg-slate-800 text-slate-300"><tr><th className="p-3">Rule</th><th className="p-3">Effect in game</th></tr></thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                    {exactRules.map((rule) => <tr key={rule.option}><td className="p-3 font-semibold text-white">{rule.option}</td><td className="p-3 text-slate-300">{rule.effect}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
