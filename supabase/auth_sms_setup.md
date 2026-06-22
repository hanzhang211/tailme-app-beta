# 自建手机号验证码登录（阿里云短信 + Vercel API + Supabase 数据库）

登录认证**完全自建**，不使用 Supabase Phone Auth、不配置 Twilio。
验证码生成/校验、密码、会话全部由本项目的 `/api/auth/*` 路由 + Supabase 数据表完成。

身份地基沿用现有 `public.users` / `pets` 等业务表；登录凭证为 **httpOnly secure session cookie**（不再只靠 localStorage）。

---

## 一、数据库（已执行的 SQL）

```sql
-- 验证码表（仅 service_role 访问：开 RLS、不加 policy）
create table if not exists public.auth_phone_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_auth_phone_codes_phone_created
  on public.auth_phone_codes (phone, created_at desc);
alter table public.auth_phone_codes enable row level security;

-- 用户密码列（bcrypt hash，可空）
alter table public.users add column if not exists password_hash text;
```

> 验证码（`code_hash`）与密码（`users.password_hash`）均 **bcrypt 加盐 hash 存储**，绝不明文落库。

---

## 二、Vercel 环境变量

| 变量名 | 说明 |
|---|---|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | 已过审的短信签名 |
| `ALIYUN_SMS_TEMPLATE_CODE` | 已过审的短信模板 CODE（正文含变量 `${code}`） |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端读写 `auth_phone_codes` / `users`（已存在） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL（已存在） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 前端业务数据读写（已存在，保持） |
| `SESSION_SECRET` | **建议新增**：会话 cookie 的 HMAC 签名密钥（任意长随机串）。**未配置时代码会回退使用 `SUPABASE_SERVICE_ROLE_KEY` 签名**，登录仍可用；但强烈建议单独设置一个，便于独立轮换。 |

> 改完环境变量需 **Redeploy** 才生效。所有密钥均无 `NEXT_PUBLIC_` 前缀（除两个本就公开的 Supabase 前端变量），不会进前端。

---

## 三、接口一览（自建，无需 Supabase 后台任何配置）

| 路由 | 作用 |
|---|---|
| `POST /api/auth/send-code` | 生成 6 位码（5 分钟有效，bcrypt 入库）+ 阿里云发送；同号 60s 频控 |
| `POST /api/auth/verify-code` | 校验验证码 → 取/建用户 → 下发会话 cookie；返回 `status: login \| need_password` |
| `POST /api/auth/set-password` | 由 cookie 授权，bcrypt 存密码（首次创建 / 忘记密码重设通用） |
| `POST /api/auth/login` | 手机号 + 密码登录（bcrypt 校验）→ 下发会话 cookie |
| `GET  /api/auth/session` | 读 cookie 还原登录态（启动时用） |
| `POST /api/auth/logout` | 清除会话 cookie |

**会话 cookie**：`tailme_session`，`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30d`。

---

## 四、阿里云前置条件（已确认通过）
- 短信签名（`ALIYUN_SMS_SIGN_NAME`）已过审。
- 短信模板（`ALIYUN_SMS_TEMPLATE_CODE`）已过审，正文含变量 **`${code}`**（代码 `templateParam = {"code": 验证码}`）。

---

## 五、联调说明
- API 路由在 Vercel 正常；阿里云短信需真实环境验证（本地可调通接口但短信费用/签名按真实计）。
- 验证顺序：① 输手机号→获取验证码（收到真实短信）；② 验证码登录→首次创建密码→进首页；③ 退出→手机号+密码登录；④ 忘记密码→验证码→重设密码→自动进首页。

---

## 六、后续可加固（本次未做）
- 把会话 cookie 校验铺到其它后端路由（admin / merchant / 内容操作），目前这些仍按前端传入的 userId 工作。
- 验证码错误次数限制（防爆破）、IP 维度频控。
- 如需「服务端强制下线」能力，可改为「会话表 + 不透明 token」方案（多一张表）。
