import AlarmForm from "./AlarmForm";
import { NewAlarmPayload } from "../types/alarm";

type AddAlarmModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: NewAlarmPayload) => Promise<void>;
  initialValues?: Partial<NewAlarmPayload>;
  heading?: string;
  submitLabel?: string;
  submittingLabel?: string;
};

const AddAlarmModal = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  heading,
  submitLabel,
  submittingLabel
}: AddAlarmModalProps) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <button
          type="button"
          className="icon-button modal-close"
          aria-label="閉じる"
          onClick={onClose}
        >
          ×
        </button>
        <AlarmForm
          onSubmit={onSubmit}
          onSuccess={onClose}
          initialValues={initialValues}
          heading={heading}
          submitLabel={submitLabel}
          submittingLabel={submittingLabel}
        />
      </div>
    </div>
  );
};

export default AddAlarmModal;
