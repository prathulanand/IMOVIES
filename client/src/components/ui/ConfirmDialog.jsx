import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="460px"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="d-flex gap-3 align-items-start py-2">
        <div className="p-2 rounded-circle bg-danger bg-opacity-25 text-danger flex-shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="m-0 text-light fs-6 lh-base">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
