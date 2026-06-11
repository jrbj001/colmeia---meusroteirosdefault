import React from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "../forms/Button.jsx";

/**
 * Colmeia ConfirmDialog — confirmation modal for destructive or
 * irreversible actions. Mirrors the "Confirmar Exclusão" flow.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message,
  highlight,
  note = "Esta ação não poderá ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "danger",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={460}
      closeOnBackdrop={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </>
      }
    >
      {message && <p style={{ margin: "0 0 12px", color: "var(--text-body)" }}>{message}</p>}
      {highlight && (
        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "16px", color: "var(--brand-primary)", wordBreak: "break-word" }}>
          “{highlight}”
        </p>
      )}
      {note && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>{note}</p>}
    </Modal>
  );
}
