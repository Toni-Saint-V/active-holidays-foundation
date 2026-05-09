import { useState } from "react";
import { ArrowRight, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";

const countries = [
  {
    id: "italy",
    flag: "🇮🇹",
    name: "Италия",
    ctaName: "Италии",
    slots: "+12%",
    decision: "≈11 дней",
    window: "до 25 авг",
    summary: "Италия сейчас выглядит самым понятным стартом, но решение упирается в документы и страховку.",
    signal: "до 25 авг",
    risk: "страховка"
  },
  {
    id: "spain",
    flag: "🇪🇸",
    name: "Испания",
    ctaName: "Испании",
    slots: "+8%",
    decision: "≈14 дней",
    window: "до 18 сен",
    summary: "Испания подходит для сравнения, но перед стартом нужно проверить запись и финансовые требования.",
    signal: "до 18 сен",
    risk: "выписка"
  },
  {
    id: "france",
    flag: "🇫🇷",
    name: "Франция",
    ctaName: "Франции",
    slots: "+5%",
    decision: "≈16 дней",
    window: "до 9 сен",
    summary: "Франция требует более осторожной подготовки: сначала закрываем слабые места, потом подачу.",
    signal: "до 9 сен",
    risk: "маршрут"
  }
] as const;

export function LandingScreen() {
  const [selectedCountryId, setSelectedCountryId] = useState<(typeof countries)[number]["id"]>("italy");
  const selectedCountry =
    countries.find((country) => country.id === selectedCountryId) ?? countries[0];

  return (
    <main className="landing-space min-h-dvh overflow-hidden bg-[#0A0A0F] text-[#F5F5F7]">
      <div className="relative mx-auto h-dvh min-h-[844px] w-full max-w-[390px] overflow-hidden px-[18px]">
        <header className="absolute left-[18px] right-[18px] top-[22px] z-10 flex items-center justify-between">
          <div className="rounded-full bg-white/[0.035] px-5 py-2.5 shadow-[inset_0_0_18px_rgba(255,255,255,0.045),0_12px_36px_rgba(0,0,0,0.22)]">
            <span className="text-[17px] font-semibold leading-none text-[#EEF4F7]">
              Active Holidays
            </span>
          </div>
          <button
            type="button"
            aria-label="Профиль"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-white/10 bg-black/12 text-white/72 shadow-[0_0_24px_rgba(255,255,255,0.035)]"
          >
            <UserRound className="h-[18px] w-[18px]" strokeWidth={1.45} />
          </button>
        </header>

        <section className="absolute left-[18px] right-[18px] top-[98px] z-10">
          <h1 className="max-w-[352px] text-[40px] font-extrabold leading-[0.98] text-white">
            Где выше <span className="text-[#FF6B35]">шанс</span>
            <br />
            на Шенген?
          </h1>
          <p className="mt-4 max-w-[350px] text-[18px] font-normal leading-[1.38] text-[#B5B6C0]">
            Сравниваем слоты, сроки записи и решения консульств.
          </p>
        </section>

        <section className="absolute left-[18px] right-[18px] top-[288px] z-10">
          <div className="flex h-[50px] items-center gap-3 rounded-full border border-[#2A2A35] bg-[#0A0D13]/92 px-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
            <Search className="h-[20px] w-[20px] shrink-0 text-[#9697A1]" strokeWidth={1.8} />
            <span className="text-[16px] font-medium text-[#8C8C96]">Найти страну поездки</span>
          </div>
        </section>

        <section className="absolute left-[18px] right-0 top-[356px] z-10 flex gap-3 overflow-hidden pb-1">
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              aria-pressed={country.id === selectedCountry.id}
              aria-label={`Выбрать ${country.name}`}
              onClick={() => setSelectedCountryId(country.id)}
              className={[
                "relative h-[130px] w-[156px] shrink-0 rounded-[20px] border px-3 pb-3 pt-3.5 text-left backdrop-blur-[2px] transition duration-200",
                country.id === selectedCountry.id
                  ? "border-[#8f4a39]/60 bg-[#1b1213]/82 shadow-[0_18px_48px_rgba(255,107,53,0.11)] ring-1 ring-[#FF6B35]/45"
                  : "border-white/[0.075] bg-[#10141a]/74 shadow-[0_16px_42px_rgba(0,0,0,0.2)] hover:border-white/15"
              ].join(" ")}
            >
              {country.id === selectedCountry.id ? (
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#FF6B35] shadow-[0_0_14px_rgba(255,107,53,0.85)]" />
              ) : null}
              <div className="flex items-center gap-2">
                <div className="grid h-[34px] w-[34px] shrink-0 place-items-center text-[25px] leading-none">
                  {country.flag}
                </div>
                <h2 className="min-w-0 text-[21px] font-bold leading-none text-white">
                  {country.name}
                </h2>
              </div>
              <dl className="mt-3 grid grid-cols-[61px_1fr] gap-x-2 gap-y-1.5 text-[13px] font-semibold leading-none">
                <dt className="text-[#8E8E98]">Слоты</dt>
                <dd className="whitespace-nowrap text-right font-bold text-[#25eeb7]">{country.slots}</dd>
                <dt className="text-[#8E8E98]">Решение</dt>
                <dd className="whitespace-nowrap text-right font-bold text-[#F5F5F7]">{country.decision}</dd>
                <dt className="text-[#8E8E98]">Окно</dt>
                <dd className="whitespace-nowrap text-right font-bold text-[#F5F5F7]">{country.window}</dd>
              </dl>
            </button>
          ))}
        </section>

        <section
          id="source-card"
          className="absolute left-[18px] right-[18px] top-[510px] z-10 h-[126px] rounded-[22px] border border-[rgba(29,101,86,0.48)] bg-[#071d1a]/84 px-3 pb-3 pt-3 shadow-[0_20px_58px_rgba(11,159,123,0.09)] backdrop-blur-[2px]"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgba(45,119,104,0.6)] bg-[#143b35]/88 px-2.5 py-1.5 text-[11px] font-bold leading-none text-[#9ccfc4]">
              <Sparkles className="h-3.5 w-3.5 text-[#83f5d5]" strokeWidth={2} />
              Aura · AI-сводка
            </span>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#a7d1c8]"
            >
              Источники
              <ArrowRight className="h-[18px] w-[18px]" />
            </button>
          </div>

          <p className="mt-3 text-[14px] font-semibold leading-[1.18] text-white">
            {selectedCountry.summary}
          </p>
          <div className="mt-3 flex items-center gap-2 overflow-hidden">
            <span className="min-w-0 rounded-full bg-[rgba(131,245,213,0.11)] px-2.5 py-1.5 text-[11px] font-bold leading-none text-[#9fe7d7]">
              Сигнал · {selectedCountry.signal}
            </span>
            <span className="min-w-0 rounded-full bg-[rgba(255,107,53,0.11)] px-2.5 py-1.5 text-[11px] font-bold leading-none text-[#ffb197]">
              Риск · {selectedCountry.risk}
            </span>
          </div>
        </section>

        <section className="absolute left-[18px] right-[18px] top-[662px] z-10 flex items-center justify-center gap-2.5">
          <ShieldCheck className="h-[24px] w-[24px] shrink-0 text-[#80ffdd]" strokeWidth={1.8} />
          <p className="whitespace-nowrap text-[12px] font-medium leading-tight text-[#999AA4]">
            Данные сверяются с сайтами консульств
          </p>
        </section>

        <div className="absolute bottom-[14px] left-[18px] right-[18px] z-10">
          <button
            type="button"
            className="flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[24px] bg-[#FF6B35] px-3 text-[16px] font-extrabold text-black shadow-[0_24px_70px_rgba(255,91,49,0.34)] transition-transform duration-200 hover:translate-y-[-1px] active:translate-y-0 min-[380px]:gap-3 min-[380px]:text-[18px]"
          >
            <span className="whitespace-nowrap">Проверить шансы по {selectedCountry.ctaName}</span>
            <ArrowRight className="h-[22px] w-[22px] shrink-0 min-[380px]:h-6 min-[380px]:w-6" strokeWidth={3} />
          </button>
        </div>
      </div>
    </main>
  );
}
