/**
 * lib/sms.ts —— 阿里云短信发送 + 手机号工具（服务端专用）
 * 密钥全走环境变量，绝不进前端：
 *   ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_SMS_SIGN_NAME / ALIYUN_SMS_TEMPLATE_CODE
 */
import Dysmsapi20170525, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import { Config } from "@alicloud/openapi-client";
import { RuntimeOptions } from "@alicloud/tea-util";

/** 归一化为 11 位中国大陆手机号（去掉 +86 / 86 前缀）；非法返回 null */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  let p = digits;
  if (digits.length === 13 && digits.startsWith("86")) p = digits.slice(2);
  else if (digits.length === 14 && digits.startsWith("086")) p = digits.slice(3);
  return /^1[3-9]\d{9}$/.test(p) ? p : null;
}

/** 调阿里云发送验证码短信（模板变量 { code }） */
export async function sendVerifyCode(
  phone: string,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    return { ok: false, message: "短信服务未配置" };
  }

  try {
    const config = new Config({ accessKeyId, accessKeySecret });
    config.endpoint = "dysmsapi.aliyuncs.com";
    const client = new Dysmsapi20170525(config);

    const request = new SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code }),
    });

    const res = await client.sendSmsWithOptions(request, new RuntimeOptions({}));
    if (res?.body?.code === "OK") return { ok: true };
    return { ok: false, message: `阿里云:${res?.body?.code || "?"} ${res?.body?.message || ""}`.trim() };
  } catch (e: any) {
    const msg = e?.data?.Message || e?.data?.Recommend || e?.message || String(e);
    console.error("[sms] 阿里云调用异常:", msg);
    return { ok: false, message: `调用异常:${msg}` };
  }
}
