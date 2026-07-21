import {
  PrismaClient,
  Role,
  RiskCategory,
  RiskStatus,
  ControlFramework,
  ControlStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const [adminPassword, auditorPassword, analystPassword, grcPassword] = await Promise.all([
    bcrypt.hash('Admin@SecureBank1!', 12),
    bcrypt.hash('Auditor@SecureBank1!', 12),
    bcrypt.hash('Analyst@SecureBank1!', 12),
    bcrypt.hash('GrcAnalyst@SecureBank1!', 12),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@securebank.com' },
    update: {
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isEmailVerified: true,
    },
    create: {
      email: 'admin@securebank.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@securebank.com' },
    update: {
      passwordHash: auditorPassword,
      role: Role.AUDITOR,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isEmailVerified: true,
    },
    create: {
      email: 'auditor@securebank.com',
      passwordHash: auditorPassword,
      firstName: 'Internal',
      lastName: 'Auditor',
      role: Role.AUDITOR,
      isEmailVerified: true,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@securebank.com' },
    update: {
      passwordHash: analystPassword,
      role: Role.ANALYST,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isEmailVerified: true,
    },
    create: {
      email: 'analyst@securebank.com',
      passwordHash: analystPassword,
      firstName: 'Security',
      lastName: 'Analyst',
      role: Role.ANALYST,
      isEmailVerified: true,
    },
  });

  const grc = await prisma.user.upsert({
    where: { email: 'grc@securebank.com' },
    update: {
      passwordHash: grcPassword,
      role: Role.GRC_ANALYST,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isEmailVerified: true,
    },
    create: {
      email: 'grc@securebank.com',
      passwordHash: grcPassword,
      firstName: 'GRC',
      lastName: 'Analyst',
      role: Role.GRC_ANALYST,
      isEmailVerified: true,
    },
  });

  // Reset demo GRC data so re-seeding is idempotent
  await prisma.evidence.deleteMany();
  await prisma.report.deleteMany();
  await prisma.control.deleteMany();
  await prisma.risk.deleteMany();

  const dueIn = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const [
    riskBruteForce,
    riskPrivEsc,
    riskDataBreach,
    riskInsider,
    riskVulnMgmt,
    riskThirdParty,
    riskConfigDrift,
    riskAuditGap,
  ] = await Promise.all([
    prisma.risk.create({
      data: {
        title: 'Credential brute-force against API authentication',
        description:
          'Attackers may attempt high-volume password guessing against /auth/login. Mitigated by account lockout and Wazuh rules 100001–100002.',
        category: RiskCategory.TECHNICAL,
        likelihood: 4,
        impact: 4,
        status: RiskStatus.IN_PROGRESS,
        dueDate: dueIn(30),
        createdById: analyst.id,
        ownerId: analyst.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Privilege escalation via role manipulation',
        description:
          'A user could attempt to escalate from ANALYST to ADMIN through token forgery or API abuse. Enforced by RBAC middleware and SOC rule 100006.',
        category: RiskCategory.TECHNICAL,
        likelihood: 2,
        impact: 5,
        status: RiskStatus.OPEN,
        dueDate: dueIn(45),
        createdById: analyst.id,
        ownerId: admin.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Unauthorised disclosure of financial records',
        description:
          'Breach of PII or transaction data via misconfiguration, insider threat, or application vulnerability. Mapped to POPIA and PCI DSS obligations.',
        category: RiskCategory.COMPLIANCE,
        likelihood: 3,
        impact: 5,
        status: RiskStatus.OPEN,
        dueDate: dueIn(60),
        createdById: grc.id,
        ownerId: grc.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Malicious insider with privileged access',
        description:
          'ADMIN or ANALYST account used to exfiltrate data or sabotage systems. Requires continuous audit-log monitoring and least privilege.',
        category: RiskCategory.OPERATIONAL,
        likelihood: 2,
        impact: 5,
        status: RiskStatus.MITIGATED,
        dueDate: dueIn(90),
        createdById: grc.id,
        ownerId: admin.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Unpatched vulnerabilities in API dependencies',
        description:
          'Outdated npm packages or container base images may introduce known CVEs. Dependabot and Semgrep are in place; OpenVAS scans planned.',
        category: RiskCategory.TECHNICAL,
        likelihood: 3,
        impact: 4,
        status: RiskStatus.IN_PROGRESS,
        dueDate: dueIn(21),
        createdById: analyst.id,
        ownerId: analyst.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Third-party / vendor access without review',
        description:
          'Contractors with lingering access after engagement ends. Access Control Policy requires time-bound credentials and quarterly reviews.',
        category: RiskCategory.OPERATIONAL,
        likelihood: 3,
        impact: 3,
        status: RiskStatus.OPEN,
        dueDate: dueIn(40),
        createdById: grc.id,
        ownerId: admin.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Insecure configuration drift in production containers',
        description:
          'Docker images or environment variables may diverge from hardened baselines (non-root user, secrets management).',
        category: RiskCategory.TECHNICAL,
        likelihood: 3,
        impact: 3,
        status: RiskStatus.ACCEPTED,
        createdById: analyst.id,
        ownerId: admin.id,
      },
    }),
    prisma.risk.create({
      data: {
        title: 'Incomplete POPIA Section 18 privacy notice',
        description:
          'Q3 audit finding POPIA-F001: no privacy notice at registration. Remediation tracked in GRC package.',
        category: RiskCategory.COMPLIANCE,
        likelihood: 5,
        impact: 3,
        status: RiskStatus.IN_PROGRESS,
        dueDate: dueIn(14),
        createdById: auditor.id,
        ownerId: grc.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.control.create({
      data: {
        title: 'Account lockout after failed logins',
        description: 'Locks accounts after 5 failed attempts for 30 minutes. Enforced in auth.service.ts.',
        framework: ControlFramework.NISTCSF,
        controlRef: 'PR.AA-02',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 85,
        risks: { connect: [{ id: riskBruteForce.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Role-based access control (ADMIN / AUDITOR / ANALYST / GRC_ANALYST)',
        description: 'JWT role claims enforced on every protected route via auth.middleware.ts.',
        framework: ControlFramework.ISO27001,
        controlRef: 'A.9.2.3',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 90,
        risks: { connect: [{ id: riskPrivEsc.id }, { id: riskInsider.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'HTTP security headers (Helmet)',
        description: 'CSP, HSTS, X-Frame-Options, X-XSS-Protection, and noSniff applied globally.',
        framework: ControlFramework.PCIDSS,
        controlRef: 'Req 6.4',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 80,
        risks: { connect: [{ id: riskDataBreach.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Immutable audit logging',
        description: 'All sensitive API operations logged with actor, IP, and timestamp.',
        framework: ControlFramework.SOX,
        controlRef: 'ITGC-LOG-01',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 88,
        risks: { connect: [{ id: riskInsider.id }, { id: riskDataBreach.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Wazuh SIEM custom detection rules',
        description: 'Rules 100001–100008 covering brute force, malware, and privilege escalation.',
        framework: ControlFramework.NISTCSF,
        controlRef: 'DE.CM-01',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 75,
        risks: { connect: [{ id: riskBruteForce.id }, { id: riskPrivEsc.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Database encryption at rest',
        description: 'PostgreSQL encryption-at-rest planned for Q3 2026. Currently tracked as open finding NIST-F002.',
        framework: ControlFramework.GDPR,
        controlRef: 'Art.32',
        status: ControlStatus.IN_PROGRESS,
        effectiveness: 40,
        risks: { connect: [{ id: riskDataBreach.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Quarterly privileged access review',
        description: 'IT Director + CISO review of ADMIN and AUDITOR accounts per Access Control Policy.',
        framework: ControlFramework.ISO27001,
        controlRef: 'A.9.2.5',
        status: ControlStatus.IN_PROGRESS,
        effectiveness: 60,
        risks: { connect: [{ id: riskThirdParty.id }, { id: riskInsider.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'Automated dependency scanning (Dependabot + Semgrep)',
        description: 'GitHub Dependabot and Semgrep SAST in CI pipeline for the API repository.',
        framework: ControlFramework.NISTCSF,
        controlRef: 'ID.RA-01',
        status: ControlStatus.IMPLEMENTED,
        effectiveness: 70,
        risks: { connect: [{ id: riskVulnMgmt.id }, { id: riskConfigDrift.id }] },
      },
    }),
    prisma.control.create({
      data: {
        title: 'POPIA privacy notice at registration',
        description: 'Remediation for audit finding POPIA-F001 — privacy notice and data-subject rights disclosure.',
        framework: ControlFramework.GDPR,
        controlRef: 'Section 18',
        status: ControlStatus.NOT_STARTED,
        effectiveness: 10,
        risks: { connect: [{ id: riskAuditGap.id }] },
      },
    }),
  ]);

  await prisma.report.createMany({
    data: [
      {
        title: 'Q3 2026 Compliance Scorecard',
        type: 'COMPLIANCE',
        format: 'PDF',
        status: 'READY',
        generatedById: grc.id,
      },
      {
        title: 'Open Risk Register Snapshot',
        type: 'RISK',
        format: 'CSV',
        status: 'READY',
        generatedById: analyst.id,
      },
      {
        title: 'Control Effectiveness Summary',
        type: 'CONTROLS',
        format: 'XLSX',
        status: 'READY',
        generatedById: auditor.id,
      },
    ],
  });

  console.log('Seed complete.');
  console.log(`Users:    4 (ADMIN, AUDITOR, ANALYST, GRC_ANALYST)`);
  console.log(`Risks:    8`);
  console.log(`Controls: 9 (linked to risks)`);
  console.log(`Reports:  3`);
  console.log('');
  console.log(`Admin:       admin@securebank.com       / Admin@SecureBank1!`);
  console.log(`Auditor:     auditor@securebank.com     / Auditor@SecureBank1!`);
  console.log(`Analyst:     analyst@securebank.com     / Analyst@SecureBank1!`);
  console.log(`GRC Analyst: grc@securebank.com         / GrcAnalyst@SecureBank1!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
