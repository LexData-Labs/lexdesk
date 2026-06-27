import { firebaseAdmin, FieldValue } from '../firebase';
import { Paths } from '../paths';
import { getTeams } from './teams';
import { setEmployeeRole } from './users';

// Management-role assignment. A "department" is one of a fixed set and is
// represented as a team (created on demand) so existing team-leader plumbing
// (approvals, scoping) keeps working. Two assignable roles:
//   - team_leader: the employee leads the department's team (team.leaderUid)
//                  and is placed on it. Their account role stays EMPLOYEE.
//   - it:          the employee is granted the IT_TEAM account role.
export const DEPARTMENTS = ['Engineering', 'Marketing', 'Project', 'IT'];
const ROLES = ['team_leader', 'it'];

async function findOrCreateDeptTeam(db, orgId, department) {
  const { teams } = await getTeams(orgId);
  const existing = teams.find((t) => t.name.toLowerCase() === department.toLowerCase());
  if (existing) return existing.id;
  const ref = await db.collection(Paths.teams(orgId)).add({
    name: department,
    leaderUid: null,
    leaderName: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'lexdesk',
  });
  return ref.id;
}

export async function assignManagementRole(orgId, { uid, department, role }) {
  if (!uid) throw Object.assign(new Error('Select an employee'), { status: 400 });
  if (!DEPARTMENTS.includes(department)) throw Object.assign(new Error('Pick a valid department'), { status: 400 });
  if (!ROLES.includes(role)) throw Object.assign(new Error('Pick a valid role'), { status: 400 });

  const { db } = firebaseAdmin();
  const userRef = db.doc(Paths.user(orgId, uid));
  const snap = await userRef.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  const data = snap.data() ?? {};
  const current = String(data.role || '').toUpperCase();
  if (current === 'ADMIN' || current === 'SUPER_ADMIN') {
    throw Object.assign(new Error('cannot_change_admin_role'), { status: 403 });
  }

  const teamId = await findOrCreateDeptTeam(db, orgId, department);
  const teamSnap = await db.doc(Paths.team(orgId, teamId)).get();
  const teamName = teamSnap.data()?.name ?? department;

  // Both roles place the employee on the chosen department for grouping.
  await userRef.update({ department, teamId, teamName });

  if (role === 'team_leader') {
    await db.doc(Paths.team(orgId, teamId)).set(
      { leaderUid: uid, leaderName: data.name ?? null },
      { merge: true },
    );
    return { ok: true, role: 'team_leader', department };
  }

  // IT role — grant the IT_TEAM account role (also syncs claims + index).
  await setEmployeeRole(uid, 'IT_TEAM', orgId);
  return { ok: true, role: 'it', department };
}
