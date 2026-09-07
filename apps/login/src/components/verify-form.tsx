"use client";

import { Alert, AlertType } from "@/components/alert";
import { handleServerActionResponse } from "@/lib/client-utils";
import { UNKNOWN_USER_ID } from "@/lib/constants";
import { resendVerification, sendVerification } from "@/lib/server/verify";
import { OTPInput } from "@/yeda/otp-input";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AutoSubmitForm } from "./auto-submit-form";
import { Button, ButtonVariants } from "./button";
import { Spinner } from "./spinner";
import { Translated } from "./translated";

type Inputs = {
  code: string;
};

type Props = {
  userId: string;
  loginName?: string;
  organization?: string;
  code?: string;
  isInvite: boolean;
  requestId?: string;
  submit: boolean;
};

export function VerifyForm({ userId, loginName, organization, requestId, code, isInvite, submit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const codeSent = searchParams.get("codeSent") === "true";

  const { register, handleSubmit, formState } = useForm<Inputs>({
    mode: "onChange",
    defaultValues: {
      code: code ?? "",
    },
  });

  const t = useTranslations("verify");

  const [error, setError] = useState<string>("");
  const [samlData, setSamlData] = useState<{ url: string; fields: Record<string, string> } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  async function resendCode() {
    setError("");
    setLoading(true);

    // do not send code for dummy userid that is set to prevent user enumeration
    if (userId === UNKNOWN_USER_ID) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoading(false);
      return;
    }

    const response = await resendVerification({
      userId,
      isInvite: isInvite,
      requestId: requestId,
    })
      .catch(() => {
        setError(t("errors.couldNotResendEmail"));
        return;
      })
      .finally(() => {
        setLoading(false);
      });

    if (response && "error" in response && response?.error) {
      setError(response.error);
      return;
    }

    // Signal success via URL search param so the "code sent" alert is shown
    const params = new URLSearchParams(searchParams.toString());
    params.set("codeSent", "true");
    router.replace(`${pathname}?${params.toString()}`);

    return response;
  }

  const processedCode = useRef<string | undefined>(undefined);

  const fcn = useCallback(
    async function submitCodeAndContinue(value: Inputs): Promise<boolean | void> {
      setError("");
      setLoading(true);

      try {
        const response = await sendVerification({
          code: value.code,
          userId,
          isInvite: isInvite,
          loginName: loginName,
          organization: organization,
          requestId: requestId,
        });

        handleServerActionResponse(response, router, setSamlData, setError);
      } catch {
        setError(t("errors.couldNotVerifyUser"));
      } finally {
        setLoading(false);
      }
    },
    [isInvite, userId, loginName, organization, requestId, router, t],
  );

  useEffect(() => {
    if (submit && code && code !== processedCode.current) {
      processedCode.current = code;
      fcn({ code });
    }
  }, [submit, code, fcn]);

  return (
    <>
      {samlData && <AutoSubmitForm url={samlData.url} fields={samlData.fields} />}
      {codeSent && (
        <div className="w-full py-4">
          <Alert type={AlertType.INFO}>
            <Translated i18nKey="verify.codeSent" namespace="verify" />
          </Alert>
        </div>
      )}
      <form className="w-full">
        <div>
          <OTPInput
            autoFocus
            {...register("code", { required: t("verify.required.code") })}
            label={t("verify.labels.code")}
            data-testid="code-text-input"
          />
        </div>

        <div className="mt-4 flex flex-row items-center justify-center text-center text-sm text-[#606273] dark:text-[#9fa3b5]">
          <span>
            <Translated i18nKey="verify.noCodeReceived" namespace="verify" />{" "}
          </span>
          <button
            aria-label="Resend Code"
            disabled={loading}
            type="button"
            className="ml-1 cursor-pointer font-medium text-[#0a59eb] transition-colors hover:text-[#0f48be] disabled:cursor-default disabled:opacity-50 dark:text-[#288fff] hover:dark:text-[#819af8]"
            onClick={() => {
              resendCode();
            }}
            data-testid="resend-button"
          >
            <Translated i18nKey="verify.resendCode" namespace="verify" />
          </button>
        </div>

        {error && (
          <div className="mt-4" data-testid="error">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="mt-8 flex w-full flex-col items-center space-y-3">
          <Button
            type="submit"
            className="!h-14 w-full justify-center !rounded-xl !bg-[#0a59eb] !text-base !font-medium text-white shadow-none hover:!bg-[#0f48be] dark:!bg-[#1170ff] dark:hover:!bg-[#0a59eb]"
            variant={ButtonVariants.Primary}
            disabled={loading || !formState.isValid}
            onClick={handleSubmit(fcn)}
            data-testid="submit-button"
          >
            {loading && <Spinner className="mr-2 h-5 w-5" />}
            <Translated i18nKey="verify.submit" namespace="verify" />
          </Button>

          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer py-1 text-sm font-medium text-[#0a59eb] transition-colors hover:text-[#0f48be] dark:text-[#288fff] hover:dark:text-[#819af8]"
            data-testid="back-button"
          >
            <Translated i18nKey="back" namespace="common" />
          </button>
        </div>
      </form>
    </>
  );
}
