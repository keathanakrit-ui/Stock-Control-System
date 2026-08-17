import { createClient } from "@supabase/supabase-js";
import {
  InputValidationError,
  validateCreateEmployeeUser,
} from "./validation.ts";

const EMPLOYEE_AUTH_DOMAIN = "staff.stock-control.internal";
const PRODUCTION_ORIGIN = "https://stock-control-system-zeta.vercel.app";

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return PRODUCTION_ORIGIN;
  if (origin === PRODUCTION_ORIGIN) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
  return null;
}

function response(
  request: Request,
  body: Record<string, unknown>,
  status: number,
): Response {
  const origin = allowedOrigin(request);
  return Response.json(body, {
    status,
    headers: {
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (request) => {
  if (!allowedOrigin(request)) {
    return response(request, { error: "Origin not allowed" }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin(request)!,
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "POST") {
    return response(request, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Admin user service configuration is incomplete");
    return response(request, { error: "Service unavailable" }, 500);
  }
  if (!token || token === authorization) {
    return response(request, { error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return response(request, { error: "Unauthorized" }, 401);
  }

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error(
      "Unable to authorize account administrator",
      profileError.message,
    );
    return response(request, { error: "Unable to verify authorization" }, 500);
  }
  if (callerProfile?.active !== true || callerProfile.role !== "SUPER_ADMIN") {
    return response(request, { error: "Forbidden" }, 403);
  }

  let input;
  try {
    input = validateCreateEmployeeUser(await request.json());
  } catch (error) {
    const message = error instanceof InputValidationError
      ? error.message
      : "Invalid request body";
    return response(request, { error: message }, 400);
  }

  const email = `${input.employeeCode}@${EMPLOYEE_AUTH_DOMAIN}`;
  const { data: created, error: createError } = await admin.auth.admin
    .createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    const duplicate =
      createError?.message.toLowerCase().includes("registered") ||
      createError?.message.toLowerCase().includes("already");
    if (!duplicate) {
      console.error(
        "Unable to create employee auth user",
        createError?.message,
      );
    }
    return response(
      request,
      {
        error: duplicate
          ? "Employee ID already exists."
          : "Unable to create employee account.",
      },
      duplicate ? 409 : 500,
    );
  }

  const { data: configuredProfile, error: updateError } = await admin.from(
    "profiles",
  ).update({
    full_name: input.fullName,
    role: input.role,
    active: input.active,
  }).eq("id", created.user.id).select("id").maybeSingle();
  if (updateError || !configuredProfile) {
    console.error(
      "Unable to configure employee profile",
      updateError?.message ?? "Profile row was not created",
    );
    const { error: cleanupError } = await admin.auth.admin.deleteUser(
      created.user.id,
    );
    if (cleanupError) {
      console.error(
        "Unable to roll back employee auth user",
        cleanupError.message,
      );
    }
    return response(
      request,
      { error: "Unable to configure employee account." },
      500,
    );
  }

  return response(request, {
    employeeCode: input.employeeCode.toUpperCase(),
    fullName: input.fullName,
    role: input.role,
    active: input.active,
  }, 201);
});
