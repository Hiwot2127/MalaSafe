import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LogoWordmark } from '@/components/brand/logo';

export default function DataUsePolicyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-6"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
            <span className="font-mono uppercase tracking-wider">Back to Home</span>
          </Link>
          
          <LogoWordmark caption="Policy · Data Use" size={32} />
        </div>

        {/* Content */}
        <div className="glass-panel p-8 md:p-12 rounded-2xl space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
              Data Use Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Effective Date: June 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">1. Purpose</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This Data Use Policy governs the collection, use, and protection of data within the MalaSafe malaria surveillance system. MalaSafe is operated by the Ethiopian Public Health Institute (EPHI) and the Ministry of Health (MOH) to support national malaria elimination efforts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">2. Authorized Use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Access to MalaSafe is restricted to authorized personnel including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Ministry of Health (MOH) officers</li>
              <li>Ethiopian Public Health Institute (EPHI) officers</li>
              <li>Regional health officers</li>
              <li>System administrators</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Users must only access data necessary for their official duties and must not share access credentials with unauthorized individuals.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">3. Data Collection</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              MalaSafe collects and processes the following types of data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Epidemiological Data:</strong> Malaria case reports, disease surveillance data, and outbreak information</li>
              <li><strong>Environmental Data:</strong> Climate data, temperature, rainfall, and geographical information</li>
              <li><strong>User Activity:</strong> Login records, actions performed, and system access logs</li>
              <li><strong>Predictive Analytics:</strong> Machine learning model predictions and risk assessments</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">4. Data Protection</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All data within MalaSafe is protected through:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Role-based access control (RBAC)</li>
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure password requirements and multi-factor authentication options</li>
              <li>Comprehensive audit logging of all system activities</li>
              <li>Regular security assessments and monitoring</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">5. Data Retention</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Malaria surveillance data is retained indefinitely for historical analysis and trend monitoring. User activity logs are retained for a minimum of 2 years for security and compliance purposes. Data may be archived according to national health data retention policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">6. Prohibited Activities</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Users must not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Access, modify, or delete data without proper authorization</li>
              <li>Share login credentials or allow unauthorized access</li>
              <li>Download or export data for personal or non-official use</li>
              <li>Attempt to circumvent security measures</li>
              <li>Introduce malicious software or interfere with system operations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">7. Monitoring and Compliance</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All system activity is monitored and logged. Unauthorized or suspicious activity may result in:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Account suspension or termination</li>
              <li>Reporting to supervisory authorities</li>
              <li>Legal action in accordance with Ethiopian law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">8. User Responsibilities</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All authorized users are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Maintaining the confidentiality of their access credentials</li>
              <li>Immediately reporting any suspected security breaches</li>
              <li>Using the system only for authorized public health purposes</li>
              <li>Logging out when leaving their workstation</li>
              <li>Complying with all applicable data protection regulations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">9. Contact Information</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For questions about this policy or to report security concerns, contact:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <strong>Email:</strong>{' '}
                <a href="mailto:admin_malasafe@gmail.com" className="text-primary hover:underline">
                  admin_malasafe@gmail.com
                </a>
              </p>
              <p className="text-sm">
                <strong>Phone:</strong>{' '}
                <a href="tel:+251703245232" className="text-primary hover:underline">
                  +251 70 324 5232
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">10. Policy Updates</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This policy may be updated periodically to reflect changes in technology, regulations, or operational requirements. Users will be notified of significant changes through the system.
            </p>
          </section>

          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              © 2026 Ethiopian Public Health Institute (EPHI) & Ministry of Health (MOH)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
