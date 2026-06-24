import { getProfile, getProfiles, getTenants } from "@/lib/queries";
import {
  isFQ, isOwner, isSchoolRole, canManageUsers, assignableRoles,
  type Profile, type Role,
} from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { inviteUser, setUserRole, setUserSchool, removeUser } from "./actions";
import { InlineSelect } from "@/components/InlineSelect";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const roleChipClass = (r: Role) =>
  r === "superadmin" ? "gold"
  : r === "accountmgr" || r === "fqviewer" ? "blue"
  : r === "schoolexec" ? "green"
  : r === "enrollmgr" ? "amber"
  : "gray";

export default async function UsersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const fq = isFQ(profile.role);
  const manage = canManageUsers(profile.role);
  if (!fq && !manage) return <div className="empty">User management isn’t available for your role.</div>;

  const tenants = await getTenants();          // RLS: FQ → all; school user → just theirs
  const people = await getProfiles();          // RLS scopes who is visible
  const myRoles = assignableRoles(profile.role);
  const roleOpts = myRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const schoolOpts = tenants.map((t) => ({ value: t.id, label: t.name }));

  const schoolName = (id: string | null) =>
    id ? (tenants.find((t) => t.id === id)?.name ?? "Unknown school") : "FocusQuest (all schools)";

  // Mirror of the server-side canActOn guardrail, for showing/hiding controls.
  const canManageTarget = (p: Profile) => {
    if (!manage || p.id === profile.id) return false;
    if (isOwner(p.role) && !isOwner(profile.role)) return false;
    if (fq) return true;
    return p.tenant_id === profile.tenant_id && isSchoolRole(p.role);
  };

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Administration</div>
        <h2>Users &amp; permissions</h2>
        <p>
          {fq
            ? "Invite people to FocusQuest or any school and set their access. FocusQuest roles see every school; school roles are scoped to one institution."
            : "Invite and manage the people at your school. You can grant school-level access only."}
        </p>
      </div>

      {manage && (
        <div className="card">
          <h3>Invite a user</h3>
          <p className="muted" style={{ fontSize: 12.5, marginTop: -4, marginBottom: 12 }}>
            They’ll get an email invite to set a password. Their role and school are applied on signup.
          </p>
          <form action={inviteUser} className="form">
            <div className="frow f3">
              <div className="field"><label>Email</label><input name="email" type="email" placeholder="person@org.com" required /></div>
              <div className="field"><label>Full name</label><input name="full_name" placeholder="Jane Doe" /></div>
              <div className="field"><label>Role</label>
                <select name="role" defaultValue={roleOpts[roleOpts.length - 1]?.value}>
                  {roleOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="frow f2">
              <div className="field"><label>School</label>
                {fq ? (
                  <select name="tenant_id" defaultValue="">
                    <option value="">— FocusQuest (no school)</option>
                    {schoolOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="tenant_id" value={profile.tenant_id ?? ""} />
                    <input value={schoolName(profile.tenant_id)} disabled />
                  </>
                )}
                <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  School is used only for school-level roles; FocusQuest roles ignore it.
                </span>
              </div>
            </div>
            <div><button className="btn gold">+ Send invite</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>School</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {people.length === 0 && <tr><td colSpan={5}><div className="empty">No users in scope yet.</div></td></tr>}
            {people.map((p) => {
              const editable = canManageTarget(p);
              const roleEditable = editable && myRoles.includes(p.role);
              const schoolEditable = editable && fq && isSchoolRole(p.role);
              return (
                <tr key={p.id}>
                  <td>
                    <b>{p.full_name || "—"}</b>
                    {p.id === profile.id && <span className="chip gold" style={{ marginLeft: 6 }}>you</span>}
                    <div className="muted" style={{ fontSize: 11 }}>{p.email}</div>
                  </td>
                  <td>
                    {roleEditable
                      ? <InlineSelect id={p.id} field="role" value={p.role} options={roleOpts} action={setUserRole} />
                      : <span className={"chip " + roleChipClass(p.role)}>{ROLE_LABELS[p.role]}</span>}
                  </td>
                  <td>
                    {schoolEditable
                      ? <InlineSelect id={p.id} field="tenant_id" value={p.tenant_id ?? ""} options={schoolOpts} action={setUserSchool} />
                      : <span style={{ fontSize: 12.5 }}>{schoolName(p.tenant_id)}</span>}
                  </td>
                  <td>
                    {p.status === "Active"
                      ? <span className="chip green">Active</span>
                      : p.status === "Invited"
                        ? <span className="chip amber">Invited</span>
                        : <span className="chip gray">{p.status}</span>}
                  </td>
                  <td>
                    {editable && (
                      <form action={removeUser}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="btn sm danger">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
