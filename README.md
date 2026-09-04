# SAI Governance Challenge - English Harder Research Version

This is the English-only V3 version of the SAI governance game for GitHub Pages.

## What changed in V3

- Added alumina particles to Level 4.
- Added 6 Governance Points per decade instead of 7.
- Added visible aerosol burden.
- Added visible infrastructure stability.
- Added food/sunlight penalty for aggressive cooling.
- Added diminishing returns if the same core strategy is repeated three times.
- Added material chemistry, regional drought inequality, overcooling, health/ecosystem and infrastructure/termination risk events.
- Added a larger research-paper explanation section on the introduction screen.
- Added an exact effect reference table inside the game.

## Local testing

```bash
npm install
npm run dev
```

## Build test

```bash
npm run build
```

## GitHub Pages

The project uses `base: './'` in `vite.config.ts`, so it should work with any GitHub Pages repository name.

In GitHub:

1. Settings -> Pages
2. Source -> GitHub Actions
3. Push to main or run the workflow manually

## Important academic note

The numerical effects in the game are simplified educational scoring rules. They are based on the directions and trade-offs described in the research literature, not exact climate-model output.

## Research sources represented in the game

Existing uploaded core sources:

- Visioni et al. (2020), *Seasonally Modulated Stratospheric Aerosol Geoengineering Alters the Climate Outcomes*.
- Cohen et al. (2025), *The impact of stratospheric aerosol injection: a regional case study*.
- Duffey et al. (2023), *Solar Geoengineering in the Polar Regions: A Review*.

Additional sources added in V3:

- Vattioni et al. (2025), *Injecting solid particles into the stratosphere could mitigate global warming but currently entails great uncertainties*.
- Vattioni et al. (2023), *Chemical Impact of Stratospheric Alumina Particle Injection for Solar Radiation Modification and Related Uncertainties*.
- Proctor et al. (2018), *Estimating global agricultural effects of geoengineering using volcanic eruptions*.
- Simpson et al. (2019), *The Regional Hydroclimate Response to Stratospheric Sulfate Geoengineering and the Role of Stratospheric Heating*.
- Haywood et al. (2013), *Asymmetric forcing from stratospheric aerosols impacts Sahelian rainfall*.
- Parker & Irvine (2018), *The Risk of Termination Shock From Solar Geoengineering*.
- Tracy et al. (2022), *Stratospheric aerosol injection may impact global systems and human health outcomes*.
- Fu et al. (2025), *Unequal socioeconomic exposure to drought extremes induced by stratospheric aerosol injection*.
