import { createClient } from "@supabase/supabase-js";
import {
  InputValidationError,
  MANAGED_ROLES,
  validateCreateEmployeeUser,
  validateResetEmployeePassword,
  validateUpdateEmployeeUser,
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

  let requestBody: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid request body");
    }
    requestBody = parsed as Record<string, unknown>;
  } catch {
    return response(request, { error: "Invalid request body" }, 400);
  }

  if (requestBody.action === "list") {
    const { data: authData, error: listError } = await admin.auth.admin
      .listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      console.error("Unable to list employee auth users", listError.message);
      return response(
        request,
        { error: "Unable to load employee accounts." },
        500,
      );
    }

    const employeeAuthUsers = authData.users.filter((user) =>
      user.email?.toLowerCase().endsWith(`@${EMPLOYEE_AUTH_DOMAIN}`)
    );
    if (employeeAuthUsers.length === 0) {
      return response(request, { users: [] }, 200);
    }

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, role, active")
      .in("id", employeeAuthUsers.map((user) => user.id));
    if (profilesError) {
      console.error("Unable to list employee profiles", profilesError.message);
      return response(
        request,
        { error: "Unable to load employee accounts." },
        500,
      );
    }

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );
    const users = employeeAuthUsers.flatMap((user) => {
      const profile = profilesById.get(user.id);
      if (
        !profile ||
        !MANAGED_ROLES.includes(profile.role) ||
        typeof profile.full_name !== "string"
      ) return [];

      return [{
        id: user.id,
        employeeCode: user.email!.slice(0, -(`@${EMPLOYEE_AUTH_DOMAIN}`).length)
          .toUpperCase(),
        fullName: profile.full_name,
        role: profile.role,
        active: profile.active === true,
        createdAt: user.created_at,
      }];
    }).sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

    return response(request, { users }, 200);
  }

  if (requestBody.action === "update") {
    let input;
    try {
      input = validateUpdateEmployeeUser(requestBody);
    } catch (error) {
      const message = error instanceof InputValidationError
        ? error.message
        : "Invalid request body";
      return response(request, { error: message }, 400);
    }

    const { data: targetAuth, error: targetAuthError } = await admin.auth.admin
      .getUserById(input.userId);
    const targetEmail = targetAuth.user?.email?.toLowerCase() ?? "";
    if (
      targetAuthError ||
      !targetAuth.user ||
      !targetEmail.endsWith(`@${EMPLOYEE_AUTH_DOMAIN}`)
    ) {
      return response(request, { error: "Employee account not found." }, 404);
    }

    const { data: updated, error: updateError } = await admin.from("profiles")
      .update({
        full_name: input.fullName,
        role: input.role,
        active: input.active,
      })
      .eq("id", input.userId)
      .in("role", [...MANAGED_ROLES])
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      console.error(
        "Unable to update employee profile",
        updateError?.message ?? "Managed profile not found",
      );
      return response(
        request,
        { error: "Unable to update employee account." },
        500,
      );
    }

    return response(request, {
      id: input.userId,
      fullName: input.fullName,
      role: input.role,
      active: input.active,
    }, 200);
  }

  if (requestBody.action === "resetPassword") {
    let input;
    try {
      input = validateResetEmployeePassword(requestBody);
    } catch (error) {
      const message = error instanceof InputValidationError
        ? error.message
        : "Invalid request body";
      return response(request, { error: message }, 400);
    }

    const { data: targetAuth, error: targetAuthError } = await admin.auth.admin
      .getUserById(input.userId);
    const targetEmail = targetAuth.user?.email?.toLowerCase() ?? "";
    if (
      targetAuthError ||
      !targetAuth.user ||
      !targetEmail.endsWith(`@${EMPLOYEE_AUTH_DOMAIN}`)
    ) {
      return response(request, { error: "Employee account not found." }, 404);
    }

    const { data: targetProfile, error: targetProfileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", input.userId)
      .maybeSingle();
    if (
      targetProfileError ||
      !targetProfile ||
      !MANAGED_ROLES.includes(targetProfile.role)
    ) {
      return response(request, { error: "Employee account not found." }, 404);
    }

    const { error: resetError } = await admin.auth.admin.updateUserById(
      input.userId,
      { password: input.password },
    );
    if (resetError) {
      console.error("Unable to reset employee password", resetError.message);
      return response(
        request,
        { error: "Unable to reset employee password." },
        500,
      );
    }

    return response(request, { passwordReset: true }, 200);
  }

  let input;
  try {
    input = validateCreateEmployeeUser(requestBody);
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
