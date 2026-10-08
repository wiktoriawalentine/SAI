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
  Microscope,
  Play,
  RefreshCcw,
  Scale,
  ShieldAlert,
  Snowflake,
  Sun,
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
const POINTS_PER_DECADE = 7;

const INITIAL_STATE: Indicators = {
  temperature: 1.6,
  ice: 70,
  food: 80,
  rain: 85,
  trust: 65,
  knowledge: 8,
  aerosolBurden: 0,
  infrastructure: 90,
};

const targetMeta: Record<TargetChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No SAI / pause', cost: 0, short: 'Avoids aerosol side effects, but background warming continues.' },
  moderate: { label: 'Stabilize near 1.5°C', cost: 2, short: 'Balanced climate control with moderate side effects.' },
  aggressive: { label: 'Aggressive cooling near 1.0°C', cost: 4, short: 'Reduces heat stress, but raises hydrological and agricultural side-effect pressure.' },
  emergency: { label: 'Emergency cooling near 0.8°C', cost: 5, short: 'Crisis intervention with high overcooling, rainfall disruption and loss of trust.' },
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; uncertainty: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known uncertainties',
    uncertainty: 'Most studied material, but linked to stratospheric heating, ozone chemistry and deposition concerns.',
  },
  caco3: {
    label: 'CaCO₃ / calcite particles',
    short: 'Partly known solid alternative',
    cost: 2,
    known: 'Partly known cooling, partly known lifetime, partly known uncertainties',
    uncertainty: 'Potentially useful alternative; acid uptake, ageing and heterogeneous chemistry remain uncertain.',
  },
  alumina: {
    label: 'Alumina particles',
    short: 'High-performance but ozone-uncertain',
    cost: 3,
    known: 'Promising optical behaviour, uncertain surface chemistry',
    uncertainty: 'Can reduce some sulfate limitations, but chlorine activation and ozone loss are highly uncertain.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Locked high-uncertainty material',
    cost: 4,
    known: 'Unknown cooling, unknown lifetime, unknown uncertainty',
    uncertainty: 'Strong only if research is high. Low knowledge creates large chemistry, rainfall and trust penalties.',
  },
};

const seasonMeta: Record<SeasonChoice, { label: string; cost: number; short: string }> = {
  annual: { label: 'Annual injection', cost: 0, short: 'Reference strategy; predictable but not regionally optimal.' },
  spring: { label: 'Spring injection', cost: 1, short: 'More efficient cooling, but stronger rainfall trade-off in the game.' },
  autumn: { label: 'Autumn injection', cost: 1, short: 'Better ice and India-rainfall trade-off in the seasonal paper.' },
};

const locationMeta: Record<LocationChoice, { label: string; cost: number; short: string }> = {
  tropical: { label: 'Tropical / equatorial injection', cost: 0, short: 'More global spread, but weaker polar rescue.' },
  subtropical: { label: 'Subtropical injection', cost: 1, short: 'Middle strategy between global control and polar targeting.' },
  polar: { label: 'Polar injection', cost: 2, short: 'Strong ice protection, but high rainfall redistribution and governance pressure.' },
};

const researchMeta: Record<ResearchChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No support action', cost: 0, short: 'Saves points, but uncertainty and social vulnerability remain.' },
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises knowledge; needed for alternative materials.' },
  monitoring: { label: 'Monitoring and open data', cost: 2, short: 'Raises trust, lowers event likelihood and improves infrastructure.' },
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
    detail: 'Basis for alumina uncertainty. Alumina surface chemistry is poorly constrained and modeled ozone impacts depend strongly on uncertain reaction assumptions.',
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
    detail: 'Basis for regional inequality events. Hemispherically asymmetric aerosol loading can create strong rainfall differences, including Sahel drought pressure.',
  },
  {
    title: 'Parker & Irvine (2018) — termination shock',
    detail: 'Basis for the interruption rule. Sudden termination after SAI can cause very rapid warming, giving natural and human systems less time to adapt.',
  },
  {
    title: 'Tracy et al. (2022) and Fu et al. (2025) — health/ecosystems and drought inequality',
    detail: 'Basis for uncertainty events and trust loss. SAI may affect public health, ecosystems, water, agriculture and unequal drought exposure.',
  },
];

const researchNeeded = {
  laboratory: ['aerosol generator', 'particle synthesis reactor', 'particle sizing (SMPS)', 'coagulation chamber', 'surface chemistry reactor'],
  measurements: ['particle size distribution', 'optical scattering', 'agglomeration behaviour', 'settling velocity', 'ozone-relevant surface reactions'],
  models: ['atmospheric transport model', 'aerosol microphysics model', 'climate model', 'crop / food-security impact model'],
};

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

function earthStatus(indicators: Indicators): { label: string; detail: string; emoji: string } {
  if (indicators.trust < 20 || indicators.rain < 20 || indicators.food < 20 || indicators.infrastructure < 20 || indicators.aerosolBurden > 90) {
    return {
      label: 'Crisis Earth',
      detail: 'Human, hydrological, or governance stability is in critical failure.',
      emoji: '⚠️',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Extreme Heat Earth',
      detail: 'Unmitigated global warming dominates regional ecosystems.',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Aggressive cooling reduces direct sunlight and monsoon rainfall.',
      emoji: '❄️',
    };
  }
  if (indicators.aerosolBurden > 65) {
    return {
      label: 'Aerosol-Strained Earth',
      detail: 'Global temperature is stabilized, but aerosol accumulation causes high environmental strain.',
      emoji: '🌫️',
    };
  }
  return {
    label: 'Managed Earth System',
    detail: 'Temperature targets are maintained with balanced hydrological trade-offs.',
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

function strategyExplanation(entry: StrategyEntry, knowledge: number): string[] {
  const notes: string[] = [];
  if (knowledge < 25) {
    return ['Scientific knowledge is still low. The council sees visible indicator changes, but detailed cause-effect interpretation is locked. Use laboratory testing or monitoring to unlock research insights.'];
  }

  if (entry.target === 'none') {
    notes.push('No SAI avoids direct aerosol side effects, but background greenhouse-gas warming continues.');
  } else if (entry.target === 'moderate') {
    notes.push('Moderate cooling stabilizes temperature near 1.5°C with balanced side effects.');
  } else if (entry.target === 'aggressive') {
    notes.push('Aggressive cooling strongly reduces heat stress, but causes direct sunlight reductions for crops and disrupts regional precipitation.');
  } else {
    notes.push('Emergency cooling controls temperature rapidly, but drastically increases stratospheric aerosol burden and precipitation deficits.');
  }

  if (knowledge >= 40 && entry.season === 'autumn') {
    notes.push('Autumn injection favours Arctic sea-ice preservation while mitigating Indian monsoon disruptions.');
  } else if (knowledge >= 40 && entry.season === 'spring') {
    notes.push('Spring injection is highly efficient for cooling, but induces larger seasonal rainfall trade-offs.');
  }

  if (knowledge >= 55 && entry.location === 'polar') {
    notes.push('Polar injection effectively preserves high-latitude sea ice, but redistributes precipitation patterns globally.');
  }

  if (knowledge >= 70 && entry.particle === 'sulfate') {
    notes.push('Sulfate is the baseline particle material with well-understood lifetime and ozone chemistry risks.');
  } else if (knowledge >= 70 && entry.particle === 'alumina') {
    notes.push('Alumina offers high optical scattering, but carries unresolved uncertainties regarding chlorine activation and ozone depletion.');
  }

  if (entry.research === 'lab') {
    notes.push('Laboratory testing unlocked particle microphysics insights, mitigating unexpected chemistry risks.');
  } else if (entry.research === 'monitoring') {
    notes.push('Monitoring and open data improved public trust and system infrastructure stability.');
  } else if (entry.research === 'adaptation') {
    notes.push('Adaptation funding shielded vulnerable regional food and water systems.');
  }

  return notes;
}

function finalOutcomeExplanation(indicators: Indicators): string {
  if (indicators.trust < 20 || indicators.food < 20 || indicators.rain < 20 || indicators.infrastructure < 20) {
    return 'The outcome ended in system instability. Controlling global average temperature is insufficient if food security, rainfall, public trust, or infrastructure collapses.';
  }
  if (indicators.aerosolBurden > 80) {
    return 'The state is technically unstable due to excessive aerosol accumulation in the stratosphere.';
  }
  if (indicators.temperature > 2.3) {
    return 'Global warming exceeded safe operational thresholds, leading to severe sea ice and agricultural losses.';
  }
  if (indicators.temperature < 1.0) {
    return 'Overcooling occurred, dampening global hydrological cycles and surface solar irradiance.';
  }
  return 'The simulation concluded in a balanced state. Global temperature was controlled while keeping regional rainfall, agriculture, public trust, and knowledge in stable ranges.';
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
                <Globe2 size={16} /> Interactive SAI governance game
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
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Goal of the game</h2>
            <p className="text-slate-300 leading-relaxed">
              Survive ten decades until 2130 without triggering collapse. A good result keeps temperature near the target, Arctic ice above danger level, food and rainfall stable, public trust alive, scientific knowledge high, aerosol burden controlled and infrastructure stable.
            </p>
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
          <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-400">{subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">{cost} GP</div>
      </div>
    </button>
  );
}

{/* --- DYNAMIC ATMOSPHERIC & EARTH VISUALIZER --- */}
function DynamicEarthCanvas({ indicators, target, particle }: { indicators: Indicators; target: TargetChoice; particle: ParticleChoice }) {
  const status = earthStatus(indicators);
  const burdenPercent = indicators.aerosolBurden;
  const rainPercent = indicators.rain;
  const foodPercent = indicators.food;
  const tempAnomaly = indicators.temperature;

  const solarIrradiance = Math.max(30, Math.round(100 - burdenPercent * 0.4 - (target === 'aggressive' ? 10 : target === 'emergency' ? 20 : 0)));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl min-h-[380px] flex flex-col justify-between p-6">
      
      {/* Stratospheric Haze Layer */}
      <div 
        className="absolute inset-x-0 top-0 h-2/5 transition-all duration-1000 z-10 pointer-events-none flex flex-col items-center justify-start pt-3"
        style={{
          background: `linear-gradient(to bottom, rgba(217, 119, 6, ${burdenPercent / 120}), rgba(15, 23, 42, 0))`
        }}
      >
        <div className="absolute inset-0 opacity-40 overflow-hidden">
          <div className="absolute top-2 left-1/4 w-2 h-2 bg-amber-200 rounded-full blur-[1px] animate-ping" />
          <div className="absolute top-8 left-2/3 w-3 h-3 bg-cyan-200 rounded-full blur-[1px] animate-pulse" />
          <div className="absolute top-4 left-1/2 w-2 h-2 bg-slate-100 rounded-full blur-[1px] animate-ping" />
        </div>
        <span className="text-xs uppercase tracking-widest text-amber-200/80 font-semibold bg-slate-950/70 px-3 py-1 rounded-full border border-amber-500/30 backdrop-blur-md">
          Stratospheric Aerosol Burden: {burdenPercent}% ({particleMeta[particle].label})
        </span>
      </div>

      {/* Dynamic Solar Sky Overlay */}
      <div 
        className="absolute inset-0 transition-all duration-1000 -z-0 pointer-events-none"
        style={{
          backgroundColor: tempAnomaly > 2.0 ? 'rgba(153, 27, 27, 0.25)' : 'rgba(14, 116, 144, 0.15)',
          filter: `brightness(${Math.max(0.4, solarIrradiance / 100)})`
        }}
      />

      {/* Sun & System Status Panel */}
      <div className="relative z-20 flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
          <Sun className={`w-7 h-7 ${solarIrradiance < 60 ? 'text-amber-600' : 'text-amber-400'} animate-spin-slow`} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Solar Irradiance</p>
            <p className="text-sm font-bold text-slate-100">{solarIrradiance}% Surface Normal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
          <span className="text-2xl">{status.emoji}</span>
          <div>
            <p className="text-xs font-bold text-slate-100">{status.label}</p>
            <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">{status.detail}</p>
          </div>
        </div>
      </div>

      {/* Rain & Monsoon Visualizer */}
      <div className="relative z-20 my-4 pointer-events-none">
        <div className="flex items-center justify-between bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <CloudRain className={`w-5 h-5 ${rainPercent < 50 ? 'text-amber-500' : 'text-cyan-400'}`} />
            <span className="text-xs font-semibold text-slate-200">Precipitation & Monsoon Health ({rainPercent}%)</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded ${rainPercent < 50 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'}`}>
            {rainPercent < 50 ? 'Drought Warning' : 'Stable Hydrology'}
          </span>
        </div>

        <div className="h-16 w-full relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50">
          {rainPercent < 40 ? (
            <div className="absolute inset-0 flex items-center justify-center text-amber-500/80 text-xs font-semibold uppercase tracking-wider">
              Severe Hydrological Deficit — Drought Stress
            </div>
          ) : (
            <div 
              className="absolute inset-0 opacity-50 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px] animate-bounce"
              style={{ animationDuration: `${Math.max(0.4, 180 / rainPercent)}s` }}
            />
          )}
        </div>
      </div>

      {/* Surface Agriculture & Crops */}
      <div className="relative z-20 bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${foodPercent < 50 ? 'bg-amber-950/50 border-amber-800 text-amber-400' : 'bg-emerald-950/50 border-emerald-800 text-emerald-400'}`}>
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Global Crop Yield & Agriculture</div>
            <div className="text-[11px] text-slate-400">Impacted by dimming (sunlight) and disrupted rain cycles.</div>
          </div>
        </div>

        <div className="w-full sm:w-40 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-400">Crop Health</span>
            <span className="font-bold text-slate-200">{foodPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${foodPercent < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${foodPercent}%` }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function ResearchInsightTracker({ knowledge, futureUnlocked }: { knowledge: number; futureUnlocked: boolean }) {
  const items = [
    {
      threshold: 0,
      title: 'Starting insight',
      text: 'SAI can lower global temperature, but temperature alone is not enough for a stable outcome.',
    },
    {
      threshold: 25,
      title: 'Level 1 insight: cooling ambition',
      text: 'Stronger cooling lowers heat pressure, but it also increases aerosol burden and can damage rainfall, agriculture and public acceptance.',
    },
    {
      threshold: 40,
      title: 'Level 2 insight: seasonality',
      text: 'Changing the injection season shifts aerosol optical depth in time. This changes Arctic ice, Indian monsoon rainfall and Amazon dry-season rainfall differently.',
    },
    {
      threshold: 55,
      title: 'Level 3 insight: injection location',
      text: 'Tropical/subtropical injection is more globally balanced. Polar injection helps ice more strongly, but it can disturb rainfall distribution outside the polar region.',
    },
    {
      threshold: 70,
      title: 'Level 4 insight: material uncertainty',
      text: 'Sulfate is the studied baseline. CaCO₃/calcite and alumina are not automatically better; their lifetime, ageing, optical behaviour and surface chemistry still need research.',
    },
    {
      threshold: 80,
      title: 'Advanced insight: future particles',
      text: futureUnlocked
        ? 'Future engineered particles are now available, but they still need monitoring because model confidence is not the same as atmospheric proof.'
        : 'Future engineered particles are still locked. The knowledge level must be high enough before the council can justify testing them.',
    },
  ];

  return (
    <InfoCard>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><Brain className="text-purple-400" /> Research insight tracker</h2>
      <div className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
        Current knowledge: <b>{knowledge}%</b>. Higher knowledge reveals numerical effects under choice cards.
      </div>
      <div className="space-y-3 text-sm">
        {items.map((item) => {
          const unlocked = knowledge >= item.threshold;
          return (
            <div key={item.title} className={`rounded-xl border p-3 ${unlocked ? 'border-purple-500/40 bg-slate-950/60 text-slate-200' : 'border-slate-800 bg-slate-950/30 text-slate-500'}`}>
              <div className="flex items-center justify-between gap-3">
                <b className={unlocked ? 'text-white' : 'text-slate-500'}>{item.title}</b>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs">{item.threshold}%</span>
              </div>
              <div className="mt-2">{unlocked ? item.text : 'Locked: invest in research to understand this mechanism.'}</div>
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
}

function lockedEffectText(threshold: number, basic: string, exact: string, knowledge: number): string {
  if (knowledge >= threshold) return exact;
  return `${basic}\nExact effect hidden until ${threshold}% knowledge.`;
}

function targetSubtitle(choice: TargetChoice, knowledge: number): string {
  const basic: Record<TargetChoice, string> = {
    none: 'No aerosol side effects, but warming continues.',
    moderate: 'Balanced intervention. Still adds aerosol burden.',
    aggressive: 'Reduces heat stress, but rainfall disruption and sunlight pressure rise.',
    emergency: 'Extreme action. High overcooling and public backlash likelihood.',
  };
  const exact: Record<TargetChoice, string> = {
    none: 'Temp follows warming; ice -10; food -6; rain -4; trust +2; burden -12; infrastructure +1.',
    moderate: 'Temp → +1.5°C; food -1; rain -3; trust +1; burden +7; infrastructure -2.',
    aggressive: 'Temp → +1.0°C; food +2 and -5 sunlight; rain -11; trust -6; burden +15; infrastructure -5.',
    emergency: 'Temp → +0.8°C; food -9 and -12 sunlight/overcooling; rain -20; trust -12; burden +22; infrastructure -8.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
}

function seasonSubtitle(choice: SeasonChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<SeasonChoice, string> = {
    annual: 'Reference strategy. Stable, but not regionally optimal.',
    spring: 'Efficient cooling, but stronger rainfall trade-off.',
    autumn: 'Better ice and India-rainfall trade-off.',
  };
  const exact: Record<SeasonChoice, string> = {
    annual: 'Ice +2; burden +2.',
    spring: 'Temp -0.05°C; rain -9; ice -4; trust -3; burden -1.',
    autumn: 'Ice +12; rain +1; trust +1; burden -1.',
  };
  return lockedEffectText(40, basic[choice], exact[choice], knowledge);
}

function locationSubtitle(choice: LocationChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<LocationChoice, string> = {
    tropical: 'Global spread, weaker polar rescue.',
    subtropical: 'Compromise: more control, more trade-offs.',
    polar: 'Strong ice rescue, but rainfall redistribution pressure.',
  };
  const exact: Record<LocationChoice, string> = {
    tropical: 'Ice -4; rain -2.',
    subtropical: 'Temp -0.05°C; ice +4; rain -4; food -1; burden +1.',
    polar: 'Ice +18; rain -18; food -10; trust -8; burden +4; infrastructure -3.',
  };
  return lockedEffectText(55, basic[choice], exact[choice], knowledge);
}

function materialSubtitle(choice: ParticleChoice, knowledge: number, paused: boolean, futureUnlocked: boolean): string {
  if (paused) return 'No injection this decade.';
  if (choice === 'future' && !futureUnlocked) return 'Locked: needs ≥80% knowledge and year ≥2090.';
  const basic: Record<ParticleChoice, string> = {
    sulfate: 'Known baseline. Lower uncertainty; studied side effects.',
    caco3: 'Solid alternative. Partly known, chemistry uncertain.',
    alumina: 'Potential solid particle option, but ozone uncertainty is high.',
    future: 'Unlocked by research. Powerful, but only after research.',
  };
  const caco3Trust = knowledge < 50 ? '-4' : '-2';
  const aluminaTrust = knowledge < 65 ? '-7' : '-3';
  const futureOutcome = knowledge > 85
    ? 'Temp -0.10°C; knowledge +1; food +6; rain +3; trust -4; burden +5.'
    : 'Temp -0.10°C; knowledge +1; food -12; rain -10; trust -15; burden +9.';
  const exact: Record<ParticleChoice, string> = {
    sulfate: 'Rain -2; trust -1; burden +4.',
    caco3: `Temp -0.05°C; knowledge +0; food +1; trust ${caco3Trust}; burden +5.`,
    alumina: `Temp -0.05°C; knowledge +1; rain -1; trust ${aluminaTrust}; burden +6.`,
    future: futureOutcome,
  };
  return lockedEffectText(70, basic[choice], exact[choice], knowledge);
}

function supportSubtitle(choice: ResearchChoice, knowledge: number): string {
  const basic: Record<ResearchChoice, string> = {
    none: 'Save points, but uncertainty remains.',
    lab: 'Research material performance and chemistry.',
    monitoring: 'Improve observation, trust and infrastructure.',
    adaptation: 'Protect affected regions and food systems.',
  };
  const exact: Record<ResearchChoice, string> = {
    none: 'No direct effect. Saves capacity this decade.',
    lab: 'Knowledge +9; trust +3; burden -2; infrastructure +1.',
    monitoring: 'Knowledge +3; trust +9; rain +2; food +2; burden -6; infrastructure +6; event likelihood lower.',
    adaptation: 'Trust +14; food +8; rain +4; infrastructure +3.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
}

export function App() {
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
  const futureUnlocked = indicators.knowledge >= 80 && year >= 2090;
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
        next.knowledge += 0;
        next.trust -= 1;
        next.rain -= 2;
        next.aerosolBurden += 4;
      }
      if (particle === 'caco3') {
        next.knowledge += 0;
        next.trust -= indicators.knowledge < 50 ? 4 : 2;
        next.food += 1;
        next.aerosolBurden += 5;
      }
      if (particle === 'alumina') {
        next.knowledge += 1;
        next.trust -= indicators.knowledge < 65 ? 7 : 3;
        next.rain -= 1;
        next.aerosolBurden += 6;
      }
      if (particle === 'future') {
        next.knowledge += 1;
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
      next.knowledge += 9;
      next.trust += 3;
      next.aerosolBurden -= 2;
      next.infrastructure += 1;
      reportText = 'Laboratory work produced new particle knowledge, but it used governance resources that could not be spent elsewhere.';
    }
    if (research === 'monitoring') {
      next.knowledge += 3;
      next.trust += 9;
      next.rain += 2;
      next.food += 2;
      next.aerosolBurden -= 6;
      next.infrastructure += 6;
      reportText = 'Monitoring improved transparency, infrastructure and early-warning capacity. It adds less knowledge than laboratory work, but makes the system more trustworthy and observable.';
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
        next.knowledge += 4;
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
          <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
          {metricCards}
          <InfoCard>
            <h2 className="mb-3 text-2xl font-black text-white">Scientific interpretation</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-100">{finalOutcomeExplanation(indicators)}</div>
              <p>Temperature is only one success criterion. The final state also depends on aerosol burden, infrastructure stability, rainfall, food security, public trust and knowledge.</p>
              <p>You used polar injection {polarCount} time(s). Polar strategies strongly protect Arctic ice, but repeated use raises lower-latitude rainfall and regional inequality pressure.</p>
              <p>You used CaCO₃/calcite {caco3Count} time(s), alumina {aluminaCount} time(s), and future engineered particles {futureCount} time(s). These choices represent the material research gap: alternative particles are promising only when uncertainty is actively reduced.</p>
              <p>You invested in laboratory or monitoring work {labCount} time(s). High knowledge and infrastructure make the strategy more defensible; low knowledge makes new materials and repeated high-burden SAI dangerous.</p>
            </div>
          </InfoCard>
          <InfoCard>
            <h2 className="mb-4 text-2xl font-black text-white">Strategy memory</h2>
            {indicators.knowledge >= 55 ? (
              <div className="space-y-3 text-sm text-slate-300">
                {strategyLog.map((entry, idx) => (
                  <div key={`${entry.year}-${idx}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <b className="text-white">{entry.year}-{entry.year + 10}:</b> {targetMeta[entry.target].label}, {seasonMeta[entry.season].label}, {locationMeta[entry.location].label}, {particleMeta[entry.particle].label}, {researchMeta[entry.research].label}.
                    {entry.event && <div className="mt-1 text-amber-200">{entry.event}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
                Detailed strategy memory is locked until 55% knowledge. The final evaluation gives only a qualitative interpretation until enough research insight is available.
              </div>
            )}
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
                {strategyExplanation(report.choices, report.current.knowledge).map((note) => <li key={note}>• {note}</li>)}
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
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><b>Governance capacity:</b> {availablePoints}</div>
            <div className={`rounded-xl border px-3 py-2 ${pointsRemaining < 0 ? 'border-red-700 bg-red-950/40 text-red-200' : 'border-slate-700 bg-slate-950'}`}><b>Selected actions:</b> {currentCost} · <b>Capacity left:</b> {pointsRemaining}</div>
            <button onClick={resetGame} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 hover:border-slate-500"><RefreshCcw size={16} /></button>
          </div>
        </div>

        {/* Dynamic Atmospheric Earth Canvas */}
        <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
        
        {metricCards}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <InfoCard>
              <h2 className="mb-4 text-2xl font-black text-white">Decade decisions</h2>
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><ThermometerSnowflake size={16} /> Level 1: Temperature target</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={target === 'none'} title="No SAI / pause" subtitle={targetSubtitle('none', indicators.knowledge)} cost={0} tone="amber" onClick={() => setTarget('none')} />
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle={targetSubtitle('moderate', indicators.knowledge)} cost={targetMeta.moderate.cost + particleMeta[particle].cost} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle={targetSubtitle('aggressive', indicators.knowledge)} cost={targetMeta.aggressive.cost + particleMeta[particle].cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? targetSubtitle('emergency', indicators.knowledge) : 'Locked until 2070 or severe warming.'} cost={targetMeta.emergency.cost + particleMeta[particle].cost} tone="red" onClick={() => setTarget('emergency')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Activity size={16} /> Level 2: Seasonality</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={season === 'annual'} title="Annual injection" subtitle={seasonSubtitle('annual', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 0} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} title="Spring injection" subtitle={seasonSubtitle('spring', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 1} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} title="Autumn injection" subtitle={seasonSubtitle('autumn', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 1} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection location</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={location === 'tropical'} title="Tropical / equatorial" subtitle={locationSubtitle('tropical', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 0} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} title="Subtropical" subtitle={locationSubtitle('subtropical', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 1} tone="blue" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} title="Polar" subtitle={locationSubtitle('polar', indicators.knowledge, target === 'none')} cost={target === 'none' ? 0 : 2} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Particle material / research gap</h3>
                  <div className="mb-3 rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-100">Alumina and other alternative materials remain uncertain until knowledge is built first.</div>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle={materialSubtitle('sulfate', indicators.knowledge, target === 'none', futureUnlocked)} cost={target === 'none' ? 0 : particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle={materialSubtitle('caco3', indicators.knowledge, target === 'none', futureUnlocked)} cost={target === 'none' ? 0 : particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'alumina'} title="Alumina particles" subtitle={materialSubtitle('alumina', indicators.knowledge, target === 'none', futureUnlocked)} cost={target === 'none' ? 0 : particleMeta.alumina.cost} tone="amber" onClick={() => setParticle('alumina')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={materialSubtitle('future', indicators.knowledge, target === 'none', futureUnlocked)} cost={target === 'none' ? 0 : particleMeta.future.cost} tone="red" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Optional support action</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No support action" subtitle={supportSubtitle('none', indicators.knowledge)} cost={0} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing" subtitle={supportSubtitle('lab', indicators.knowledge)} cost={2} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data" subtitle={supportSubtitle('monitoring', indicators.knowledge)} cost={2} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation" subtitle={supportSubtitle('adaptation', indicators.knowledge)} cost={2} tone="amber" onClick={() => setResearch('adaptation')} />
                  </div>
                </section>
              </div>
              {pointsRemaining < 0 && <div className="mt-5 rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">The selected package exceeds the available governance capacity. Choose a less demanding strategy.</div>}
              {lastTwoSameCore && <div className="mt-5 rounded-2xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">Warning: using the same core strategy again will trigger diminishing returns.</div>}
              <button onClick={processDecade} disabled={pointsRemaining < 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                <Play size={18} /> Complete decade
              </button>
            </InfoCard>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ResearchInsightTracker knowledge={indicators.knowledge} futureUnlocked={futureUnlocked} />

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
              <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><ShieldAlert className="text-red-400" /> Stability and uncertainty rules</h2>
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Termination shock:</b> stopping or interrupting SAI after repeated deployment can end the game.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Aerosol burden:</b> high cumulative burden causes rainfall, food, trust and infrastructure penalties.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Diminishing returns:</b> using the same core strategy three times in a row triggers lock-in penalties.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Material chemistry:</b> CaCO₃, alumina and future particles can trigger surprise side effects if knowledge is too low.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Crop sunlight penalty:</b> aggressive aerosol loading can lower food security even if heat stress is reduced.</div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><b>Regional inequality:</b> polar/asymmetric choices can trigger concentrated drought and trust collapse.</div>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
