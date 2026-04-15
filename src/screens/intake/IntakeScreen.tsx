import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  travelIntakeSubmissionSchema,
  type TravelIntakeSubmission
} from "@shared/contracts";
import { useTravelFlowStore } from "@/state/travelFlowStore";

type TravelIntakeDraft = {
  departureWindow: TravelIntakeSubmission["departureWindow"] | "";
  passportStatus: TravelIntakeSubmission["passportStatus"] | "";
  destinationReadiness: TravelIntakeSubmission["destinationReadiness"] | "";
  needsVisaSupport: boolean;
};

const initialDraft: TravelIntakeDraft = {
  departureWindow: "",
  passportStatus: "",
  destinationReadiness: "",
  needsVisaSupport: false
};

const departureWindowOptions: Array<{
  value: TravelIntakeSubmission["departureWindow"];
  label: string;
}> = [
  { value: "lt_30_days", label: "Менее 30 дней" },
  { value: "one_to_three_months", label: "От 1 до 3 месяцев" },
  { value: "more_than_three_months", label: "Больше 3 месяцев" }
];

const passportStatusOptions: Array<{
  value: TravelIntakeSubmission["passportStatus"];
  label: string;
}> = [
  { value: "valid", label: "Паспорт в порядке" },
  { value: "needs_renewal", label: "Нужно проверить или обновить" },
  { value: "missing", label: "Паспорта нет" }
];

const destinationReadinessOptions: Array<{
  value: TravelIntakeSubmission["destinationReadiness"];
  label: string;
}> = [
  { value: "chosen", label: "Направление уже выбрано" },
  { value: "comparing", label: "Сравниваю несколько вариантов" },
  { value: "undecided", label: "Пока не определился" }
];

export function IntakeScreen() {
  const navigate = useNavigate();
  const submitIntake = useTravelFlowStore((state) => state.submitIntake);
  const storeStatus = useTravelFlowStore((state) => state.status);
  const storeError = useTravelFlowStore((state) => state.errorMessage);
  const [draft, setDraft] = useState<TravelIntakeDraft>(initialDraft);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function updateDraft<Key extends keyof TravelIntakeDraft>(
    key: Key,
    value: TravelIntakeDraft[Key]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedDraft = travelIntakeSubmissionSchema.safeParse(draft);

    if (!parsedDraft.success) {
      setValidationMessage("Заполните все поля анкеты перед отправкой.");
      return;
    }

    setValidationMessage(null);

    try {
      await submitIntake(parsedDraft.data);
      navigate("/result");
    } catch {
      // Store error state already contains the actionable message for the user.
    }
  }

  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Анкета</p>
      <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
        Первый детерминированный поток анкеты
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
        Черновик формы живёт локально в компоненте. После отправки данные попадают в
        типизированный репозиторий и сохраняются как последняя сессия для экрана результата.
      </p>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-sm text-textPrimary">Когда планируете поездку</span>
          <select
            className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary"
            value={draft.departureWindow}
            onChange={(event) => updateDraft("departureWindow", event.target.value as TravelIntakeDraft["departureWindow"])}
          >
            <option value="">Выберите срок</option>
            {departureWindowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-textPrimary">Что с паспортом</span>
          <select
            className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary"
            value={draft.passportStatus}
            onChange={(event) => updateDraft("passportStatus", event.target.value as TravelIntakeDraft["passportStatus"])}
          >
            <option value="">Выберите статус</option>
            {passportStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-textPrimary">Насколько определено направление</span>
          <select
            className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary"
            value={draft.destinationReadiness}
            onChange={(event) =>
              updateDraft(
                "destinationReadiness",
                event.target.value as TravelIntakeDraft["destinationReadiness"]
              )
            }
          >
            <option value="">Выберите состояние</option>
            {destinationReadinessOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.needsVisaSupport}
            onChange={(event) => updateDraft("needsVisaSupport", event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm leading-6 text-textPrimary">
            Нужна отдельная проверка визовых требований
          </span>
        </label>

        {(validationMessage || storeError) && (
          <div className="rounded-xl border border-danger/40 bg-dangerBg px-4 py-3 text-sm text-textPrimary">
            {validationMessage ?? storeError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={storeStatus === "submitting"}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {storeStatus === "submitting"
              ? "Сохраняем анкету..."
              : "Отправить и получить результат"}
          </button>
          <Link
            to="/result"
            className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
          >
            Открыть последний результат
          </Link>
        </div>
      </form>
    </section>
  );
}
