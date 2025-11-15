import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import AlarmForm from "./AlarmForm";
const AddAlarmModal = ({ open, onClose, onSubmit, initialValues, heading, submitLabel, submittingLabel }) => {
    if (!open)
        return null;
    return (_jsx("div", { className: "modal-backdrop", children: _jsxs("div", { className: "modal-panel", children: [_jsx("button", { type: "button", className: "icon-button modal-close", "aria-label": "\u9589\u3058\u308B", onClick: onClose, children: "\u00D7" }), _jsx(AlarmForm, { onSubmit: onSubmit, onSuccess: onClose, initialValues: initialValues, heading: heading, submitLabel: submitLabel, submittingLabel: submittingLabel })] }) }));
};
export default AddAlarmModal;
