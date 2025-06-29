import {
  Button,
  Classes,
  Dialog,
  type DialogProps,
  type IconName,
  Intent,
} from "@blueprintjs/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpening?: () => void;
  title?: string;
  className?: string;
  children: ReactNode;
  footerContent?: ReactNode;
  cancelButtonText?: string;
  primaryButton?: {
    text: string;
    icon?: IconName;
    onClick: () => void;
    intent?: Intent;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryButton?: {
    text: string;
    icon?: IconName;
    onClick: () => void;
    intent?: Intent;
    disabled?: boolean;
  };
}

export default function BaseDialog({
  isOpen,
  onClose,
  onOpening,
  title,
  className = "w-[90%] sm:w-[640px]",
  children,
  footerContent,
  cancelButtonText,
  primaryButton,
  secondaryButton,
}: BaseDialogProps) {
  const { t } = useTranslation();
  const defaultCancelText = t("commons.lbl_btn_cancel");

  const dialogProps: Partial<DialogProps> = {
    isOpen,
    usePortal: true,
    onClose,
    className,
    title,
  };

  if (onOpening) {
    dialogProps.onOpening = onOpening;
  }

  return (
    <Dialog {...dialogProps}>
      <div className={`${Classes.DIALOG_BODY} flex flex-col gap-3`}>
        {children}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        {footerContent}
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            intent={Intent.NONE}
            onClick={onClose}
            icon="cross"
            size="large"
            text={cancelButtonText || defaultCancelText}
            disabled={primaryButton?.loading}
          />
          {secondaryButton && (
            <Button
              intent={secondaryButton.intent || Intent.NONE}
              onClick={secondaryButton.onClick}
              icon={secondaryButton.icon}
              size="large"
              text={secondaryButton.text}
              disabled={secondaryButton.disabled || primaryButton?.loading}
            />
          )}
          {primaryButton && (
            <Button
              intent={primaryButton.intent || Intent.PRIMARY}
              onClick={primaryButton.onClick}
              icon={primaryButton.icon}
              size="large"
              text={primaryButton.text}
              disabled={primaryButton.disabled}
              loading={primaryButton.loading}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
