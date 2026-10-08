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
  eventType?: 'chemistry' | 'drought' | 'ecosystem' | 'none';
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
  trust: 70,
  knowledge: 10,
  aerosolBurden: 0,
  infrastructure: 90,
};

const targetMeta: Record<TargetChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No SAI / pause', cost: 0, short: 'Avoids aerosol side effects, but background warming continues.' },
  moderate: { label: 'Stabilize near 1.5°C', cost: 1, short: 'Balanced climate control with moderate side effects.' },
  aggressive: { label: 'Aggressive cooling near 1.0°C', cost: 2, short: 'Reduces heat stress, but raises hydrological and agricultural side-effect pressure.' },
  emergency: { label: 'Emergency cooling near 0.8°C', cost: 3, short: 'Crisis intervention with high overcooling and rainfall disruption.' },
};

const particleMeta: Record<ParticleChoice, { label: string; short: string; cost: number; known: string; uncertainty: string }> = {
  sulfate: {
    label: 'Sulfate particles',
    short: 'Known baseline',
    cost: 1,
    known: 'Known cooling, known lifetime, known uncertainties',
    uncertainty: 'Most studied material, but linked to stratospheric heating and ozone concerns.',
  },
  caco3: {
    label: 'CaCO₃ / calcite particles',
    short: 'Partly known solid alternative',
    cost: 1,
    known: 'Partly known cooling, partly known lifetime',
    uncertainty: 'Potentially useful alternative; chemistry and ageing remain partly uncertain.',
  },
  alumina: {
    label: 'Alumina particles',
    short: 'High-performance particle',
    cost: 2,
    known: 'Promising optical behaviour',
    uncertainty: 'Can reduce sulfate limitations, but chlorine surface chemistry needs research.',
  },
  future: {
    label: 'Future engineered particle',
    short: 'Advanced material',
    cost: 2,
    known: 'High efficiency',
    uncertainty: 'Requires high knowledge to deploy safely without trust or rain penalties.',
  },
};

const seasonMeta: Record<SeasonChoice, { label: string; cost: number; short: string }> = {
  annual: { label: 'Annual injection', cost: 0, short: 'Reference strategy; predictable baseline.' },
  spring: { label: 'Spring injection', cost: 1, short: 'Efficient seasonal cooling.' },
  autumn: { label: 'Autumn injection', cost: 1, short: 'Better ice and monsoon rainfall trade-off.' },
};

const locationMeta: Record<LocationChoice, { label: string; cost: number; short: string }> = {
  tropical: { label: 'Tropical / equatorial injection', cost: 0, short: 'Global aerosol distribution.' },
  subtropical: { label: 'Subtropical injection', cost: 1, short: 'Middle strategy between global control and polar targeting.' },
  polar: { label: 'Polar injection', cost: 1, short: 'Strong ice protection with targeted polar cooling.' },
};

const researchMeta: Record<ResearchChoice, { label: string; cost: number; short: string }> = {
  none: { label: 'No support action', cost: 0, short: 'Saves points, but leaves vulnerability unaddressed.' },
  lab: { label: 'Laboratory particle testing', cost: 2, short: 'Raises scientific knowledge (+8%) and unlocks particle insights.' },
  monitoring: { label: 'Monitoring and open data', cost: 2, short: 'Raises trust (+10%), lowers event likelihood, and improves infrastructure.' },
  adaptation: { label: 'Adaptation and compensation', cost: 2, short: 'Protects food (+10%), rain (+6%), and trust (+12%) in vulnerable regions.' },
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
    knowledge: Math.round(clamp(next.knowledge, 0, 100)),
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
  if (target !== 'none') {
    cost += particleMeta[particle].cost;
    cost += seasonMeta[season].cost;
    cost += locationMeta[location].cost;
  }
  cost += researchMeta[research].cost;
  return cost;
}

function applyBurdenPressure(next: Indicators): string[] {
  const notes: string[] = [];
  if (next.aerosolBurden > 55) {
    next.rain -= 2;
    next.food -= 1;
    notes.push('Aerosol burden exceeded 55%: mild hydrological pressure applied.');
  }
  if (next.aerosolBurden > 75) {
    next.rain -= 3;
    next.food -= 2;
    next.trust -= 2;
    next.infrastructure -= 2;
    notes.push('Aerosol burden exceeded 75%: elevated side-effect pressure zone.');
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
  let chance = 0.08;
  chance += particle === 'future' ? 0.10 : particle === 'alumina' ? 0.06 : particle === 'caco3' ? 0.04 : 0.02;
  chance += target === 'emergency' ? 0.08 : target === 'aggressive' ? 0.04 : 0;
  chance += location === 'polar' ? 0.05 : 0;
  chance += indicators.aerosolBurden / 500;
  chance -= research === 'monitoring' ? 0.08 : 0;
  chance -= research === 'lab' ? 0.03 : 0;
  return Math.max(0.04, Math.min(0.40, chance));
}

function earthStatus(indicators: Indicators): { label: string; detail: string; emoji: string } {
  if (indicators.trust <= 0 || indicators.rain <= 0 || indicators.food <= 0 || indicators.infrastructure <= 0 || indicators.ice <= 0) {
    return {
      label: 'Critical Failure State',
      detail: 'At least one vital planetary attribute collapsed to 0%.',
      emoji: '💥',
    };
  }
  if (indicators.temperature >= 2.5) {
    return {
      label: 'Extreme Heat Earth',
      detail: 'Unmitigated global warming dominates ecosystems.',
      emoji: '🔥',
    };
  }
  if (indicators.temperature <= 0.9) {
    return {
      label: 'Overcooled Earth',
      detail: 'Aggressive cooling dampens hydrological cycles.',
      emoji: '❄️',
    };
  }
  if (indicators.aerosolBurden > 65) {
    return {
      label: 'Strained Managed Earth',
      detail: 'Temperature is controlled, but cumulative aerosol burden is elevated.',
      emoji: '🌫️',
    };
  }
  return {
    label: 'Managed Earth System',
    detail: 'Temperature targets are maintained with stable regional trade-offs.',
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

  if (knowledge < 30) {
    notes.push('🔬 Basic Observation (<30% Knowledge): Primary temperature targets and basic support actions are monitored. Invest in laboratory testing to reveal microphysical and hydroclimate mechanics.');
    if (entry.target === 'none') notes.push('No SAI deployed; greenhouse warming continues.');
    else notes.push(`Deployed ${targetMeta[entry.target].label} cooling.`);
    return notes;
  }

  notes.push('📊 Hydroclimate Insight (30%+ Knowledge): Monsoon and seasonal shift analysis unlocked.');
  if (entry.target === 'none') {
    notes.push('No SAI avoids direct aerosol side effects, but background warming reduces Arctic ice and crop resilience.');
  } else if (entry.target === 'moderate') {
    notes.push('Moderate cooling stabilizes temperature near 1.5°C while keeping hydrological disruption low.');
  } else if (entry.target === 'aggressive') {
    notes.push('Aggressive cooling reduces heat stress, but direct sunlight reductions affect crop photosynthesis (Proctor et al. 2018).');
  } else {
    notes.push('Emergency cooling controls temperature rapidly, but causes significant rainfall reduction (Simpson et al. 2019).');
  }

  if (entry.season === 'autumn') {
    notes.push('Autumn injection favours Arctic sea-ice preservation while mitigating Indian monsoon disruptions (Visioni et al. 2020).');
  }
  if (entry.location === 'polar') {
    notes.push('Polar injection preserves Arctic ice, but redistributes precipitation patterns to lower latitudes (Duffey et al. 2023).');
  }

  if (knowledge >= 60) {
    notes.push('🧪 Microphysical & Chemistry Insight (60%+ Knowledge): Solid particle chemistry and ozone dynamics unlocked.');
    if (entry.particle === 'sulfate') {
      notes.push('Sulfate aerosols create stratospheric heating and moderate ozone disruption, but remain the most predictable option (Simpson et al. 2019).');
    } else if (entry.particle === 'caco3') {
      notes.push('CaCO₃ calcite particles neutralize stratospheric acids, reducing ozone depletion risks (Vattioni et al. 2025).');
    } else if (entry.particle === 'alumina') {
      notes.push('Alumina provides strong optical scattering, but chlorine surface chemistry uncertainties remain active (Vattioni et al. 2023).');
    } else if (entry.particle === 'future') {
      notes.push('Engineered nanoparticles optimize optical scattering while minimizing microphysical coagulation.');
    }
  }

  if (knowledge >= 90) {
    notes.push('⚡ Complete Theoretical Precision (90%+ Mastery): Full predictive clarity achieved! All radiative forcing, ozone feedback loops, and regional monsoon responses are completely understood and optimized.');
  }

  if (entry.research === 'lab') {
    notes.push('Laboratory testing generated +8% Scientific Knowledge.');
  } else if (entry.research === 'monitoring') {
    notes.push('Monitoring and open data boosted public trust (+10% Trust) and infrastructure resilience.');
  } else if (entry.research === 'adaptation') {
    notes.push('Adaptation funding shielded vulnerable agriculture and water distribution networks.');
  }

  return notes;
}

function lockedEffectText(threshold: number, basic: string, exact: string, knowledge: number): string {
  if (knowledge >= threshold) return exact;
  return `${basic}\nExact effect hidden until ${threshold}% knowledge.`;
}

function targetSubtitle(choice: TargetChoice, knowledge: number): string {
  const basic: Record<TargetChoice, string> = {
    none: 'No aerosol side effects, but warming continues.',
    moderate: 'Balanced intervention. Moderate side effects.',
    aggressive: 'Reduces heat stress, but rainfall disruption and sunlight pressure rise.',
    emergency: 'Extreme action. High overcooling and public backlash likelihood.',
  };
  const exact: Record<TargetChoice, string> = {
    none: 'Temp follows warming; ice -6; food -4; rain -3; trust +2; burden -15; infrastructure +2.',
    moderate: 'Temp → +1.5°C; food -1; rain -2; trust +2; burden +5.',
    aggressive: 'Temp → +1.0°C; food -3; rain -4; trust -1; burden +10.',
    emergency: 'Temp → +0.8°C; food -5; rain -8; trust -3; burden +15.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
}

function seasonSubtitle(choice: SeasonChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<SeasonChoice, string> = {
    annual: 'Reference strategy. Stable, predictable baseline.',
    spring: 'Efficient seasonal cooling.',
    autumn: 'Better ice and India-monsoon trade-off.',
  };
  const exact: Record<SeasonChoice, string> = {
    annual: 'Ice +2; burden +1.',
    spring: 'Ice +1; rain -2.',
    autumn: 'Ice +8; rain +2.',
  };
  return lockedEffectText(40, basic[choice], exact[choice], knowledge);
}

function locationSubtitle(choice: LocationChoice, knowledge: number, paused: boolean): string {
  if (paused) return 'No injection this decade.';
  const basic: Record<LocationChoice, string> = {
    tropical: 'Global spread, balanced forcing.',
    subtropical: 'Middle strategy between global control and polar targeting.',
    polar: 'Strong ice rescue, but rainfall redistribution pressure.',
  };
  const exact: Record<LocationChoice, string> = {
    tropical: 'Rain +1.',
    subtropical: 'Ice +3; rain -1.',
    polar: 'Ice +12; rain -6; food -3.',
  };
  return lockedEffectText(55, basic[choice], exact[choice], knowledge);
}

function materialSubtitle(choice: ParticleChoice, knowledge: number, paused: boolean, futureUnlocked: boolean): string {
  if (paused) return 'No injection this decade.';
  if (choice === 'future' && !futureUnlocked) return 'Locked: needs ≥80% knowledge and year ≥2090.';
  const basic: Record<ParticleChoice, string> = {
    sulfate: 'Known baseline. Lower uncertainty; studied side effects.',
    caco3: 'Solid alternative. Partly known, chemistry uncertain.',
    alumina: 'Potential solid particle option with high optical performance.',
    future: 'Unlocked by high research. Highly efficient.',
  };
  const exact: Record<ParticleChoice, string> = {
    sulfate: 'Rain -1; burden +3.',
    caco3: 'Food +2; burden +3.',
    alumina: 'Knowledge +2; burden +3.',
    future: 'Knowledge +3; food +5; rain +2; burden +2.',
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
    lab: 'Knowledge +8; trust +3; infrastructure +2.',
    monitoring: 'Knowledge +3; trust +10; infrastructure +8.',
    adaptation: 'Trust +12; food +10; rain +6.',
  };
  return lockedEffectText(25, basic[choice], exact[choice], knowledge);
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
                You are the climate council from 2030 to 2130. Manage global temperature, monsoon rainfall, food security, public trust, and scientific knowledge across ten decades.
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
              Stratospheric aerosol injection (SAI) scatters incoming sunlight to reduce surface warming. It lowers average temperatures, but requires careful governance of regional trade-offs.
            </p>
          </InfoCard>

          <InfoCard>
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-white"><Scale className="text-amber-400" /> Game Rules & Scientific Mastery</h2>
            <p className="text-slate-300 leading-relaxed">
              Survive 10 decades until 2130. You receive **7 GP** each decade. Reaching **100% Knowledge** requires sustained laboratory testing across the century and unlocks total theoretical insight in decade reports!
            </p>
          </InfoCard>
        </div>

        <InfoCard>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-white"><BookOpen className="text-emerald-400" /> Research Foundations</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {sourceThemes.map((source) => (
              <div key={source.title} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="font-bold text-white">{source.title}</div>
                <div className="mt-1 text-sm text-slate-400">{source.detail}</div>
              </div>
            ))}
          </div>
        </InfoCard>
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
        <div className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">
          {cost} GP
        </div>
      </div>
    </button>
  );
}

// AI-STYLE ILLUSTRATED EVENT BANNER COMPONENT
function EventGraphicIllustration({ eventType }: { eventType?: 'chemistry' | 'drought' | 'ecosystem' | 'none' }) {
  if (!eventType || eventType === 'none') return null;

  return (
    <div className="relative my-4 overflow-hidden rounded-2xl border border-amber-500/50 bg-slate-950/90 p-4 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-48 h-28 shrink-0 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center">
          {eventType === 'chemistry' && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex items-center justify-center p-2">
              <FlaskConical className="w-12 h-12 text-purple-400 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(#c084fc_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
            </div>
          )}
          {eventType === 'drought' && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 flex items-center justify-center p-2">
              <CloudRain className="w-12 h-12 text-amber-500 animate-bounce" />
              <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:14px_14px] opacity-30" />
            </div>
          )}
          {eventType === 'ecosystem' && (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex items-center justify-center p-2">
              <ShieldAlert className="w-12 h-12 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />
            </div>
          )}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Planetary Hazard Triggered
          </div>
          <h4 className="text-base font-black text-white">
            {eventType === 'chemistry' && 'Stratospheric Microphysical Anomaly'}
            {eventType === 'drought' && 'Monsoon Shift & Drought Pressure'}
            {eventType === 'ecosystem' && 'Public Health & Ecosystem Scrutiny'}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {eventType === 'chemistry' && 'Laboratory reaction assumptions faced unforeseen chlorine chemistry in the stratosphere (Vattioni et al. 2023).'}
            {eventType === 'drought' && 'Targeting polar latitudes caused a lower-latitude shift in precipitation cycles (Duffey et al. 2023).'}
            {eventType === 'ecosystem' && 'Localized crop and regional health reports created public scrutiny and trust fluctuations (Tracy et al. 2022).'}
          </p>
        </div>
      </div>
    </div>
  );
}

{/* --- DYNAMIC VISUAL ENVIRONMENT & ATMOSPHERIC CANVAS --- */}
function DynamicEarthCanvas({ indicators, target, particle }: { indicators: Indicators; target: TargetChoice; particle: ParticleChoice }) {
  const status = earthStatus(indicators);
  const burdenPercent = indicators.aerosolBurden;
  const rainPercent = indicators.rain;
  const foodPercent = indicators.food;
  const tempAnomaly = indicators.temperature;

  const solarIrradiance = Math.max(30, Math.round(100 - burdenPercent * 0.3 - (target === 'aggressive' ? 6 : target === 'emergency' ? 12 : 0)));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl min-h-[420px] flex flex-col justify-between p-6">
      
      {/* Stratospheric Haze Layer */}
      <div 
        className="absolute inset-x-0 top-0 h-2/5 transition-all duration-1000 z-10 pointer-events-none flex flex-col items-center justify-start pt-3"
        style={{
          background: `linear-gradient(to bottom, rgba(217, 119, 6, ${burdenPercent / 100}), rgba(15, 23, 42, 0))`
        }}
      >
        <div className="absolute inset-0 opacity-50 overflow-hidden">
          <div className="absolute top-2 left-1/4 w-3 h-3 bg-amber-200 rounded-full blur-[2px] animate-ping" />
          <div className="absolute top-8 left-2/3 w-4 h-4 bg-cyan-200 rounded-full blur-[2px] animate-pulse" />
          <div className="absolute top-4 left-1/2 w-3 h-3 bg-slate-100 rounded-full blur-[2px] animate-ping" />
        </div>
        <span className="text-xs uppercase tracking-widest text-amber-200/90 font-bold bg-slate-950/80 px-4 py-1.5 rounded-full border border-amber-500/40 backdrop-blur-md shadow-lg">
          Stratospheric Aerosol Burden: {burdenPercent}% ({particleMeta[particle].label})
        </span>
      </div>

      {/* Dynamic Solar Sky Overlay */}
      <div 
        className="absolute inset-0 transition-all duration-1000 -z-0 pointer-events-none"
        style={{
          backgroundColor: tempAnomaly > 2.0 ? 'rgba(185, 28, 28, 0.25)' : 'rgba(14, 116, 144, 0.15)',
          filter: `brightness(${Math.max(0.35, solarIrradiance / 100)})`
        }}
      />

      {/* Header Panel: Sun & System Status */}
      <div className="relative z-20 flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="relative flex items-center justify-center">
            <Sun className={`w-8 h-8 ${solarIrradiance < 60 ? 'text-amber-600' : 'text-amber-400'} animate-spin-slow`} />
            <div className="absolute inset-0 rounded-full blur-sm bg-amber-400/30 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Solar Irradiance</p>
            <p className="text-base font-black text-slate-100">{solarIrradiance}% Surface Normal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-3xl">{status.emoji}</span>
          <div>
            <p className="text-sm font-black text-slate-100">{status.label}</p>
            <p className="text-[11px] text-slate-400 max-w-[220px] leading-tight">{status.detail}</p>
          </div>
        </div>
      </div>

      {/* Weather & Rainfall Dynamic Layer */}
      <div className="relative z-20 my-2 pointer-events-none">
        <div className="flex items-center justify-between bg-slate-950/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 mb-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CloudRain className={`w-5 h-5 ${rainPercent < 40 ? 'text-amber-500' : 'text-cyan-400'}`} />
            <span className="text-xs font-bold text-slate-200">Precipitation & Monsoon Health ({rainPercent}%)</span>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${rainPercent < 40 ? 'bg-amber-950/80 text-amber-300 border border-amber-700' : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700'}`}>
            {rainPercent < 40 ? 'Drought Warning' : 'Stable Hydrology'}
          </span>
        </div>

        {/* Dynamic Weather Renderer */}
        <div className="h-20 w-full relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/60 shadow-inner flex items-center justify-center">
          {rainPercent >= 40 ? (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="rainPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <line x1="10" y1="0" x2="5" y2="15" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="25" y1="10" x2="20" y2="25" stroke="#0284c7" strokeWidth="1.2" strokeLinecap="round" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#rainPattern)" className="animate-bounce" style={{ animationDuration: `${Math.max(0.3, 150 / rainPercent)}s` }} />
            </svg>
          ) : (
            <div className="flex items-center gap-2 text-amber-400/90 font-bold text-xs uppercase tracking-widest bg-amber-950/40 px-4 py-2 rounded-xl border border-amber-800/50">
              ⚠️ Severe Hydrological Deficit — Drought Stress Region
            </div>
          )}
        </div>
      </div>

      {/* Surface Agriculture Field Canvas */}
      <div className="relative z-20 bg-slate-950/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className={`p-3 rounded-2xl border transition-all duration-500 ${foodPercent >= 70 ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400' : foodPercent >= 40 ? 'bg-amber-950/80 border-amber-700 text-amber-400' : 'bg-red-950/80 border-red-700 text-red-400'}`}>
            <Wheat className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-100 flex items-center gap-2">
              Global Agricultural & Crop Health
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${foodPercent >= 70 ? 'bg-emerald-900/60 text-emerald-300' : foodPercent >= 40 ? 'bg-amber-900/60 text-amber-300' : 'bg-red-900/60 text-red-300'}`}>
                {foodPercent >= 70 ? 'Lush & Healthy' : foodPercent >= 40 ? 'Moderate Yield' : 'Wilted / Drought'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Directly affected by sunlight irradiance dimming and rain cycles.</div>
          </div>
        </div>

        {/* Dynamic Plant SVG Canvas Graphic */}
        <div className="w-full md:w-64 h-16 rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden relative flex items-end justify-around px-3 pb-1">
          {foodPercent >= 70 ? (
            <svg className="w-full h-12 text-emerald-400" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 30 Q 12 15 15 0 M 15 10 Q 8 5 5 2 M 15 15 Q 22 10 25 8" />
              <path d="M35 30 Q 37 12 40 0 M 40 10 Q 33 5 30 2 M 40 15 Q 47 10 50 8" />
              <path d="M65 30 Q 67 15 70 0 M 70 10 Q 63 5 60 2 M 70 15 Q 77 10 80 8" />
              <path d="M88 30 Q 90 14 92 0 M 92 10 Q 85 5 82 2 M 92 15 Q 97 10 100 8" />
            </svg>
          ) : foodPercent >= 40 ? (
            <svg className="w-full h-10 text-amber-400" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 30 Q 18 20 22 10 M 22 18 Q 15 14 12 10" />
              <path d="M35 30 Q 42 18 45 8 M 45 16 Q 38 12 35 8" />
              <path d="M65 30 Q 72 20 75 10 M 75 18 Q 68 14 65 10" />
            </svg>
          ) : (
            <svg className="w-full h-7 text-red-500/80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 30 Q 20 28 25 22 M 35 30 Q 40 28 42 24 M 65 30 Q 70 29 72 25 M 85 30 Q 88 28 90 23" />
              <line x1="0" y1="29" x2="100" y2="29" stroke="#7f1d1d" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>

    </div>
  );
}

function ResearchInsightTracker({ knowledge, futureUnlocked }: { knowledge: number; futureUnlocked: boolean }) {
  const items = [
    {
      threshold: 30,
      title: '30% Knowledge: Basic Hydroclimate Insights',
      text: 'Unlocks target numerical parameter changes and basic monsoon trade-off reports.',
    },
    {
      threshold: 60,
      title: '60% Knowledge: Microphysics & Material Chemistry',
      text: 'Unlocks solid particle chemistry, ozone feedback details, and particle numerical insights.',
    },
    {
      threshold: 80,
      title: '80% Knowledge: Future Particle Unlocked',
      text: futureUnlocked
        ? 'Future engineered particles are unlocked for high-efficiency cooling.'
        : 'Future engineered particles unlock once year >= 2090.',
    },
    {
      threshold: 100,
      title: '100% Knowledge: Total Theoretical Precision',
      text: knowledge >= 100 
        ? 'FULL MASTERY ACHIEVED: Perfect predictive insights unlocked in all decade reports!'
        : 'Requires sustained Laboratory Testing across almost all 10 decades to achieve.',
    },
  ];

  return (
    <InfoCard>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-white"><Brain className="text-purple-400" /> Scientific Knowledge Tracker</h2>
      <div className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-sm text-purple-100">
        Scientific Knowledge: <b>{knowledge}% / 100%</b>. Perform Laboratory Testing (+8%/decade) to reach 100% Scientific Mastery by the final decades!
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
              <div className="mt-2">{unlocked ? item.text : 'Locked: perform Laboratory Testing to advance knowledge.'}</div>
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
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
  const [attributeCollapseReason, setAttributeCollapseReason] = useState<string | null>(null);

  const futureUnlocked = indicators.knowledge >= 80 && year >= 2090;
  const emergencyUnlocked = year >= 2070 || indicators.temperature >= 2.3;

  const currentCost = computeCost(target, particle, season, location, research);
  const pointsRemaining = POINTS_PER_DECADE - currentCost;

  const processDecade = () => {
    if (currentCost > POINTS_PER_DECADE) return;

    const previousTarget = strategyLog[strategyLog.length - 1]?.target ?? 'none';
    const activeSAIDecades = strategyLog.filter((e) => e.target !== 'none').length;

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
    let reportTitle = 'Decade Overview';
    let reportText = 'The climate system responded to your governance decisions.';
    let eventType: 'chemistry' | 'drought' | 'ecosystem' | 'none' = 'none';

    if (target === 'none') {
      next.temperature = withoutSAI;
      next.ice -= 6;
      next.food -= 4;
      next.rain -= 3;
      next.trust += 2;
      next.aerosolBurden -= 15;
      next.infrastructure += 2;
      reportText = 'No SAI deployed this decade. Direct side effects avoided, but baseline warming increased.';
    } else {
      let desiredTemp = targetTemperature(target, withoutSAI);
      next.temperature = Math.max(0.4, desiredTemp);

      if (target === 'moderate') {
        next.food -= 1;
        next.rain -= 2;
        next.trust += 2;
        next.aerosolBurden += 5;
      }
      if (target === 'aggressive') {
        next.food -= 3;
        next.rain -= 4;
        next.trust -= 1;
        next.aerosolBurden += 10;
      }
      if (target === 'emergency') {
        next.food -= 5;
        next.rain -= 8;
        next.trust -= 3;
        next.aerosolBurden += 15;
      }

      if (particle === 'sulfate') {
        next.rain -= 1;
        next.aerosolBurden += 3;
      }
      if (particle === 'caco3') {
        next.food += 2;
        next.aerosolBurden += 3;
      }
      if (particle === 'alumina') {
        next.knowledge += 2;
        next.aerosolBurden += 3;
      }
      if (particle === 'future') {
        next.knowledge += 3;
        next.food += 5;
        next.rain += 2;
        next.aerosolBurden += 2;
      }

      if (season === 'annual') next.ice += 2;
      if (season === 'spring') { next.ice += 1; next.rain -= 2; }
      if (season === 'autumn') { next.ice += 8; next.rain += 2; }

      if (location === 'tropical') next.rain += 1;
      if (location === 'subtropical') { next.ice += 3; next.rain -= 1; }
      if (location === 'polar') { next.ice += 12; next.rain -= 6; next.food -= 3; }
    }

    if (research === 'lab') {
      next.knowledge += 8;
      next.trust += 3;
      next.infrastructure += 2;
    }
    if (research === 'monitoring') {
      next.knowledge += 3;
      next.trust += 10;
      next.infrastructure += 8;
    }
    if (research === 'adaptation') {
      next.trust += 12;
      next.food += 10;
      next.rain += 6;
    }

    applyBurdenPressure(next);

    let eventChance = calcEventChance(target, particle, location, research, next);
    if (Math.random() < eventChance) {
      const eventRoll = Math.random();
      if ((particle === 'alumina' || particle === 'caco3' || particle === 'future') && eventRoll < 0.35) {
        next.knowledge += 3;
        next.trust -= 8;
        next.rain -= 4;
        event = 'Material chemistry surprise: laboratory assumptions faced stratospheric chemistry uncertainties. Knowledge increased, but public trust dipped slightly (Vattioni et al. 2023).';
        reportTitle = 'Decade Report: Material Surprises';
        eventType = 'chemistry';
      } else if (location === 'polar' && eventRoll < 0.70) {
        next.rain -= 6;
        next.food -= 4;
        next.trust -= 5;
        event = 'Regional hydroclimate shift: polar targeting effectively cooled high latitudes but shifted lower-latitude rainfall (Duffey et al. 2023).';
        reportTitle = 'Decade Report: Regional Hydroclimate Shift';
        eventType = 'drought';
      } else {
        next.food -= 4;
        next.rain -= 3;
        next.trust -= 4;
        event = 'Public health & ecosystem variance: localized side-effect reports increased public scrutiny (Tracy et al. 2022).';
        reportTitle = 'Decade Report: Ecosystem Scrutiny';
        eventType = 'ecosystem';
      }
    }

    const rounded = roundIndicators(next);

    if (rounded.ice <= 0 || rounded.food <= 0 || rounded.rain <= 0 || rounded.trust <= 0 || rounded.infrastructure <= 0) {
      let failedAttr = '';
      if (rounded.ice <= 0) failedAttr = 'Arctic Sea Ice';
      if (rounded.food <= 0) failedAttr = 'Food Security';
      if (rounded.rain <= 0) failedAttr = 'Rainfall / Monsoon Stability';
      if (rounded.trust <= 0) failedAttr = 'Public Trust';
      if (rounded.infrastructure <= 0) failedAttr = 'Operational Infrastructure';

      setAttributeCollapseReason(failedAttr);
      setGameOver(true);
      return;
    }

    const entry: StrategyEntry = { year, particle, target, season, location, research, cost: currentCost, event };

    setIndicators(rounded);
    setHistory((prev) => [...prev, { year: nextYear, ...rounded, withoutSAI }]);
    setStrategyLog((prev) => [...prev, entry]);
    setYear(nextYear);
    setReport({ year: nextYear, title: reportTitle, text: reportText, event, eventType, previous, current: rounded, cost: currentCost, choices: entry });
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
    setAttributeCollapseReason(null);
  };

  if (introOpen) return <IntroScreen onStart={() => setIntroOpen(false)} />;

  if (terminationShock) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl shadow-red-950/40">
          <AlertOctagon className="mx-auto mb-5 text-red-400" size={88} />
          <h1 className="text-5xl font-black text-white">Termination Shock</h1>
          <p className="mt-5 text-left text-lg leading-relaxed text-slate-300">
            The SAI program was abruptly interrupted. Unmasked greenhouse warming occurred rapidly, triggering catastrophic system collapse (Parker & Irvine 2018).
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-6 py-4 font-bold text-white hover:bg-red-600">
            <RefreshCcw size={18} /> Restart Game
          </button>
        </div>
      </div>
    );
  }

  if (gameOver && attributeCollapseReason) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200 flex items-center justify-center font-sans">
        <div className="max-w-3xl rounded-3xl border border-red-800 bg-red-950/30 p-8 text-center shadow-2xl">
          <AlertTriangle className="mx-auto mb-5 text-red-500" size={88} />
          <h1 className="text-5xl font-black text-white">System Collapse</h1>
          <p className="mt-4 text-2xl font-bold text-red-400">{attributeCollapseReason} reached 0%</p>
          <p className="mt-4 text-slate-300">
            A core planetary or human resilience metric dropped to zero, breaking system stability. Use Monitoring or Compensation & Adaptation actions to keep Trust, Food, and Rainfall well above danger levels.
          </p>
          <button onClick={resetGame} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500">
            <RefreshCcw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const metricCards = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
      <MetricCard icon={<ThermometerSnowflake size={22} />} title="Temp." value={`+${indicators.temperature.toFixed(2)}°C`} tone={indicators.temperature > 2 ? 'text-red-400' : 'text-cyan-400'} />
      <MetricCard icon={<Snowflake size={22} />} title="Ice" value={`${indicators.ice}%`} tone={indicators.ice < 20 ? 'text-red-400 font-bold' : 'text-blue-400'} />
      <MetricCard icon={<Wheat size={22} />} title="Food" value={`${indicators.food}%`} tone={indicators.food < 20 ? 'text-red-400 font-bold' : 'text-amber-400'} />
      <MetricCard icon={<CloudRain size={22} />} title="Rain" value={`${indicators.rain}%`} tone={indicators.rain < 20 ? 'text-red-400 font-bold' : 'text-cyan-400'} />
      <MetricCard icon={<Scale size={22} />} title="Trust" value={`${indicators.trust}%`} tone={indicators.trust < 20 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
      <MetricCard icon={<Beaker size={22} />} title="Knowledge" value={`${indicators.knowledge}%`} tone={indicators.knowledge >= 100 ? 'text-emerald-400 font-bold' : indicators.knowledge >= 50 ? 'text-purple-400 font-bold' : 'text-amber-400'} />
      <MetricCard icon={<Gauge size={22} />} title="Burden" value={`${indicators.aerosolBurden}%`} tone={indicators.aerosolBurden > 65 ? 'text-red-400' : 'text-slate-300'} note="lower is better" />
      <MetricCard icon={<Wrench size={22} />} title="Infrastructure" value={`${indicators.infrastructure}%`} tone={indicators.infrastructure < 20 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
    </div>
  );

  if (gameOver) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
            <h1 className="text-4xl font-black text-white">Century Completed: 2130</h1>
            <p className="mt-2 text-emerald-400 font-bold text-lg">Congratulations! You successfully governed SAI across ten decades without a planetary collapse.</p>
            {indicators.knowledge >= 100 && (
              <p className="mt-2 text-purple-300 font-semibold">🏆 Scientific Mastery Reached: 100% Knowledge Achieved!</p>
            )}
          </div>
          <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
          {metricCards}
          <button onClick={resetGame} className="mx-auto flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500"><RefreshCcw size={18} /> Play Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-200 font-sans">
      {/* HIGHLY ENGAGING DECADE OVERVIEW MODAL */}
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900/95 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3 py-1 text-xs text-blue-300 font-bold mb-2">
                  <Globe2 size={14} /> DECADE EXECUTIVE SUMMARY
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">{report.title} ({report.year - 10}–{report.year})</h2>
              </div>
              <button onClick={closeReport} className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-500 transition">
                Proceed to {report.year}
              </button>
            </div>

            <p className="mb-4 text-slate-300 text-base leading-relaxed">{report.text}</p>

            {/* AI Illustrated Event Graphic inside Decade Overview */}
            <EventGraphicIllustration eventType={report.eventType} />

            <div className="my-6">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">Resilience & Planetary Indicators Delta</h3>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {([
                  ['temperature', 'Temperature'],
                  ['ice', 'Arctic Ice'],
                  ['food', 'Food Security'],
                  ['rain', 'Rainfall'],
                  ['trust', 'Public Trust'],
                  ['knowledge', 'Knowledge'],
                  ['aerosolBurden', 'Aerosol Burden'],
                  ['infrastructure', 'Infrastructure'],
                ] as [keyof Indicators, string][]).map(([key, label]) => {
                  const diff = differenceText(key, report.current[key], report.previous[key]);
                  const value = key === 'temperature' ? `+${report.current[key].toFixed(2)}°C` : `${report.current[key]}%`;
                  return (
                    <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
                      <div className="mt-1 text-2xl font-black text-white">{value}</div>
                      <div className={`text-xs font-black mt-1 ${diff.className}`}>{diff.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <InfoCard>
              <h3 className="mb-3 text-lg font-black text-white flex items-center gap-2">
                <Brain className="text-purple-400" /> Knowledge-Based Executive Analysis
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {strategyExplanation(report.choices, report.current.knowledge).map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">SAI Governance Challenge</h1>
            <p className="text-sm text-slate-400">Decade Planning: {year} to {year + 10}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><b>Governance Capacity:</b> {POINTS_PER_DECADE} GP</div>
            <div className={`rounded-xl border px-3 py-2 ${pointsRemaining < 0 ? 'border-red-700 bg-red-950/40 text-red-200' : 'border-slate-700 bg-slate-950'}`}><b>Cost:</b> {currentCost} GP · <b>Left:</b> {pointsRemaining} GP</div>
            <button onClick={resetGame} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 hover:border-slate-500"><RefreshCcw size={16} /></button>
          </div>
        </div>

        {/* Visual Atmospheric Canvas */}
        <DynamicEarthCanvas indicators={indicators} target={target} particle={particle} />
        
        {metricCards}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <InfoCard>
              <h2 className="mb-4 text-2xl font-black text-white">Decade Decisions</h2>
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><ThermometerSnowflake size={16} /> Level 1: Target Choice</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={target === 'none'} title="No SAI / pause" subtitle={targetSubtitle('none', indicators.knowledge)} cost={targetMeta.none.cost} tone="amber" onClick={() => setTarget('none')} />
                    <ChoiceCard selected={target === 'moderate'} title="Stabilize near 1.5°C" subtitle={targetSubtitle('moderate', indicators.knowledge)} cost={targetMeta.moderate.cost} tone="blue" onClick={() => setTarget('moderate')} />
                    <ChoiceCard selected={target === 'aggressive'} title="Aggressive cooling near 1.0°C" subtitle={targetSubtitle('aggressive', indicators.knowledge)} cost={targetMeta.aggressive.cost} tone="emerald" onClick={() => setTarget('aggressive')} />
                    <ChoiceCard selected={target === 'emergency'} disabled={!emergencyUnlocked} title="Emergency cooling near 0.8°C" subtitle={emergencyUnlocked ? targetSubtitle('emergency', indicators.knowledge) : 'Locked until 2070 or severe warming.'} cost={targetMeta.emergency.cost} tone="red" onClick={() => setTarget('emergency')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Activity size={16} /> Level 2: Seasonality</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={season === 'annual'} title="Annual injection" subtitle={seasonSubtitle('annual', indicators.knowledge, target === 'none')} cost={seasonMeta.annual.cost} onClick={() => setSeason('annual')} />
                    <ChoiceCard selected={season === 'spring'} title="Spring injection" subtitle={seasonSubtitle('spring', indicators.knowledge, target === 'none')} cost={seasonMeta.spring.cost} tone="amber" onClick={() => setSeason('spring')} />
                    <ChoiceCard selected={season === 'autumn'} title="Autumn injection" subtitle={seasonSubtitle('autumn', indicators.knowledge, target === 'none')} cost={seasonMeta.autumn.cost} tone="emerald" onClick={() => setSeason('autumn')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Globe2 size={16} /> Level 3: Injection Location</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={location === 'tropical'} title="Tropical / equatorial" subtitle={locationSubtitle('tropical', indicators.knowledge, target === 'none')} cost={locationMeta.tropical.cost} onClick={() => setLocation('tropical')} />
                    <ChoiceCard selected={location === 'subtropical'} title="Subtropical" subtitle={locationSubtitle('subtropical', indicators.knowledge, target === 'none')} cost={locationMeta.subtropical.cost} tone="blue" onClick={() => setLocation('subtropical')} />
                    <ChoiceCard selected={location === 'polar'} title="Polar" subtitle={locationSubtitle('polar', indicators.knowledge, target === 'none')} cost={locationMeta.polar.cost} tone="red" onClick={() => setLocation('polar')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Atom size={16} /> Level 4: Material Selection</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={particle === 'sulfate'} title="Sulfate particles" subtitle={materialSubtitle('sulfate', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.sulfate.cost} tone="blue" onClick={() => setParticle('sulfate')} />
                    <ChoiceCard selected={particle === 'caco3'} title="CaCO₃ / calcite particles" subtitle={materialSubtitle('caco3', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.caco3.cost} tone="purple" onClick={() => setParticle('caco3')} />
                    <ChoiceCard selected={particle === 'alumina'} title="Alumina particles" subtitle={materialSubtitle('alumina', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.alumina.cost} tone="amber" onClick={() => setParticle('alumina')} />
                    <ChoiceCard selected={particle === 'future'} disabled={!futureUnlocked} title="Future engineered particle" subtitle={materialSubtitle('future', indicators.knowledge, target === 'none', futureUnlocked)} cost={particleMeta.future.cost} tone="red" onClick={() => setParticle('future')} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-300"><Microscope size={16} /> Support Action</h3>
                  <div className="space-y-2">
                    <ChoiceCard selected={research === 'none'} title="No support action" subtitle={supportSubtitle('none', indicators.knowledge)} cost={researchMeta.none.cost} onClick={() => setResearch('none')} />
                    <ChoiceCard selected={research === 'lab'} title="Laboratory particle testing (+Knowledge)" subtitle={supportSubtitle('lab', indicators.knowledge)} cost={researchMeta.lab.cost} tone="purple" onClick={() => setResearch('lab')} />
                    <ChoiceCard selected={research === 'monitoring'} title="Monitoring and open data (+Trust & Infra)" subtitle={supportSubtitle('monitoring', indicators.knowledge)} cost={researchMeta.monitoring.cost} tone="emerald" onClick={() => setResearch('monitoring')} />
                    <ChoiceCard selected={research === 'adaptation'} title="Compensation and adaptation (+Food & Rain)" subtitle={supportSubtitle('adaptation', indicators.knowledge)} cost={researchMeta.adaptation.cost} tone="amber" onClick={() => setResearch('adaptation')} />
                  </div>
                </section>
              </div>

              {pointsRemaining < 0 && <div className="mt-5 rounded-2xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-200">Selected package exceeds your 7 Governance Points limit! Choose a lighter combination.</div>}

              <button onClick={processDecade} disabled={pointsRemaining < 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed">
                <Play size={18} /> Complete Decade
              </button>
            </InfoCard>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ResearchInsightTracker knowledge={indicators.knowledge} futureUnlocked={futureUnlocked} />

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Temperature Trajectory</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} stroke="#64748b" />
                    <YAxis domain={[0, 4.2]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ value: '1.5°C', fill: '#10b981', fontSize: 10 }} />
                    <Line type="linear" dataKey="withoutSAI" name="Without SAI" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="linear" dataKey="temperature" name="Actual Temp." stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>

            <InfoCard>
              <h2 className="mb-4 text-xl font-black text-white">Planetary & Human Resilience Metrics</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[START_YEAR, END_YEAR]} stroke="#64748b" />
                    <YAxis domain={[0, 100]} stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} label={{ value: 'COLLAPSE THRESHOLD (0%)', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="linear" dataKey="ice" name="Arctic Ice" stroke="#38bdf8" strokeWidth={2} />
                    <Line type="linear" dataKey="food" name="Food Security" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="linear" dataKey="rain" name="Rainfall" stroke="#2dd4bf" strokeWidth={2} />
                    <Line type="linear" dataKey="trust" name="Public Trust" stroke="#a78bfa" strokeWidth={2} />
                    <Line type="linear" dataKey="knowledge" name="Knowledge" stroke="#e879f9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
