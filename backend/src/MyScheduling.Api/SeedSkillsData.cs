using Microsoft.EntityFrameworkCore;
using MyScheduling.Core.Entities;
using MyScheduling.Infrastructure.Data;

namespace MyScheduling.Api;

public static class SeedSkillsData
{
    public static async Task SeedSkillsAndCertifications(MySchedulingDbContext context, bool forceRefresh = false)
    {
        // Check if we should force refresh (delete and reseed)
        if (forceRefresh)
        {
            Console.WriteLine("Force refresh enabled. Clearing existing skills and certifications...");

            // Delete all person_skills first (FK constraint)
            var personSkills = await context.PersonSkills.ToListAsync();
            context.PersonSkills.RemoveRange(personSkills);
            await context.SaveChangesAsync();
            Console.WriteLine($"Cleared {personSkills.Count} person skills.");

            // Delete all skills
            var existingSkills = await context.Skills.ToListAsync();
            context.Skills.RemoveRange(existingSkills);
            await context.SaveChangesAsync();
            Console.WriteLine($"Cleared {existingSkills.Count} existing skills.");

            // Delete all person_certifications first (FK constraint)
            var personCerts = await context.PersonCertifications.ToListAsync();
            context.PersonCertifications.RemoveRange(personCerts);
            await context.SaveChangesAsync();
            Console.WriteLine($"Cleared {personCerts.Count} person certifications.");

            // Delete all certifications
            var existingCerts = await context.Certifications.ToListAsync();
            context.Certifications.RemoveRange(existingCerts);
            await context.SaveChangesAsync();
            Console.WriteLine($"Cleared {existingCerts.Count} existing certifications.");
        }

        // Check if skills already exist
        if (await context.Skills.AnyAsync())
        {
            Console.WriteLine("Skills already seeded. Skipping skills seed. Use SEED_SKILLS_FORCE=true to refresh.");
            return;
        }

        Console.WriteLine("Seeding skills catalog...");

        var skills = GetAllSkills();

        // Insert in batches of 50 to avoid parameter limits
        const int batchSize = 50;
        int totalSeeded = 0;

        for (int i = 0; i < skills.Count; i += batchSize)
        {
            var batch = skills.Skip(i).Take(batchSize).ToList();
            await context.Skills.AddRangeAsync(batch);
            await context.SaveChangesAsync();
            totalSeeded += batch.Count;
            Console.WriteLine($"Seeded batch {(i / batchSize) + 1}: {totalSeeded}/{skills.Count} skills");
        }

        Console.WriteLine($"Seeded {totalSeeded} skills total.");

        // Seed certifications
        if (!await context.Certifications.AnyAsync())
        {
            Console.WriteLine("Seeding certifications catalog...");
            var certifications = GetAllCertifications();

            // Insert certifications in batches too
            int certsSeeded = 0;
            for (int i = 0; i < certifications.Count; i += batchSize)
            {
                var batch = certifications.Skip(i).Take(batchSize).ToList();
                await context.Certifications.AddRangeAsync(batch);
                await context.SaveChangesAsync();
                certsSeeded += batch.Count;
            }
            Console.WriteLine($"Seeded {certsSeeded} certifications.");
        }
    }

    private static List<Skill> GetAllSkills()
    {
        var allSkills = new List<Skill>();
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;

        void AddSkills(string[] names, SkillCategory category)
        {
            foreach (var name in names)
            {
                if (seenNames.Add(name)) // Returns false if already exists
                {
                    allSkills.Add(new Skill
                    {
                        Id = Guid.NewGuid(),
                        Name = name,
                        Category = category,
                        IsApproved = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }
        }

        // ==================== PROGRAMMING LANGUAGES ====================
        var programmingLanguages = new[]
        {
            "Python", "Java", "C#", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C",
            "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "Shell/Bash",
            "PowerShell", "SQL", "PL/SQL", "T-SQL", "F#", "Groovy", "Lua", "Dart", "Elixir",
            "Haskell", "Clojure", "Julia", "COBOL", "Fortran", "Assembly", "VBA", "Objective-C"
        };
        AddSkills(programmingLanguages, SkillCategory.ProgrammingLanguage);

        // ==================== WEB DEVELOPMENT ====================
        var webDevelopment = new[]
        {
            "React", "Angular", "Vue.js", "Node.js", "Express.js", "Next.js", "Nuxt.js",
            "ASP.NET Core", "ASP.NET MVC", "Django", "Flask", "FastAPI", "Spring Boot",
            "Ruby on Rails", "Laravel", "Symfony", "HTML5", "CSS3", "SASS/SCSS", "Tailwind CSS",
            "Bootstrap", "Material UI", "GraphQL", "REST API Design", "WebSockets", "gRPC",
            "Webpack", "Vite", "Gatsby", "Svelte", "Remix", "Blazor", "jQuery", "Redux",
            "MobX", "Zustand", "React Query", "Apollo GraphQL", "Three.js", "D3.js"
        };
        AddSkills(webDevelopment, SkillCategory.WebDevelopment);

        // ==================== MOBILE DEVELOPMENT ====================
        var mobileDevelopment = new[]
        {
            "React Native", "Flutter", "iOS Development", "Android Development",
            "SwiftUI", "Jetpack Compose", "Xamarin", ".NET MAUI", "Ionic", "Capacitor",
            "Cordova", "Progressive Web Apps (PWA)", "Mobile UI/UX", "App Store Optimization",
            "Firebase Mobile", "Push Notifications", "Mobile Security", "Expo"
        };
        AddSkills(mobileDevelopment, SkillCategory.MobileDevelopment);

        // ==================== DATABASE TECHNOLOGIES ====================
        var databaseTechnologies = new[]
        {
            "PostgreSQL", "MySQL", "Microsoft SQL Server", "Oracle Database", "MongoDB",
            "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "CosmosDB", "Neo4j",
            "MariaDB", "SQLite", "InfluxDB", "TimescaleDB", "CockroachDB", "Couchbase",
            "Firebase Firestore", "Supabase", "PlanetScale", "Snowflake", "BigQuery",
            "Database Design", "Data Modeling", "Query Optimization", "Database Administration",
            "ETL Processes", "Data Migration", "Stored Procedures", "Database Replication"
        };
        AddSkills(databaseTechnologies, SkillCategory.DatabaseTechnology);

        // ==================== CLOUD PLATFORMS ====================
        var cloudPlatforms = new[]
        {
            // AWS
            "Amazon Web Services (AWS)", "AWS EC2", "AWS Lambda", "AWS S3", "AWS RDS",
            "AWS DynamoDB", "AWS CloudFormation", "AWS CDK", "AWS ECS/EKS", "AWS API Gateway",
            "AWS IAM", "AWS CloudWatch", "AWS SNS/SQS", "AWS Step Functions", "AWS Cognito",
            "AWS VPC", "AWS Route 53", "AWS CloudFront", "AWS Glue", "AWS Athena",
            // Azure
            "Microsoft Azure", "Azure Functions", "Azure App Service", "Azure DevOps",
            "Azure Active Directory", "Azure SQL", "Azure Blob Storage", "Azure Kubernetes Service (AKS)",
            "Azure Event Hub", "Azure Service Bus", "Azure Logic Apps", "Azure Cosmos DB",
            "Azure Monitor", "Azure Key Vault", "Azure Virtual Network", "Azure Front Door",
            // GCP
            "Google Cloud Platform (GCP)", "Google Cloud Functions", "Google Kubernetes Engine (GKE)",
            "Google Cloud Storage", "Google Cloud SQL", "Google BigQuery", "Google Pub/Sub",
            "Google Cloud Run", "Google App Engine",
            // Other Cloud
            "Oracle Cloud Infrastructure (OCI)", "IBM Cloud", "DigitalOcean", "Heroku",
            "Vercel", "Netlify", "Cloudflare", "Linode", "Cloud Architecture", "Multi-Cloud Strategy"
        };
        AddSkills(cloudPlatforms, SkillCategory.CloudPlatform);

        // ==================== DEVOPS TOOLS ====================
        var devOpsTools = new[]
        {
            "Docker", "Kubernetes", "Terraform", "Ansible", "Puppet", "Chef", "Vagrant",
            "Jenkins", "GitLab CI/CD", "GitHub Actions", "Azure Pipelines", "CircleCI",
            "Travis CI", "ArgoCD", "Flux", "Helm", "Istio", "Linkerd", "Prometheus",
            "Grafana", "ELK Stack", "Datadog", "New Relic", "Splunk", "PagerDuty",
            "HashiCorp Vault", "Consul", "Nomad", "Packer", "Git", "GitHub", "GitLab",
            "Bitbucket", "SVN", "Infrastructure as Code", "CI/CD Pipeline Design",
            "Release Management", "Configuration Management", "Container Orchestration"
        };
        AddSkills(devOpsTools, SkillCategory.DevOpsTools);

        // ==================== INFRASTRUCTURE ====================
        var infrastructure = new[]
        {
            "Linux Administration", "Windows Server Administration", "Network Administration",
            "VMware vSphere", "Hyper-V", "Proxmox", "Load Balancing", "HAProxy", "Nginx",
            "Apache HTTP Server", "IIS", "DNS Management", "DHCP", "Active Directory",
            "LDAP", "Firewall Management", "VPN Configuration", "Network Infrastructure Security",
            "Storage Area Networks (SAN)", "Network Attached Storage (NAS)", "Backup Solutions",
            "Disaster Recovery", "High Availability", "Site Reliability Engineering (SRE)",
            "System Monitoring", "Capacity Planning", "Performance Tuning", "Virtualization"
        };
        AddSkills(infrastructure, SkillCategory.Infrastructure);

        // ==================== CYBERSECURITY ====================
        var cyberSecurity = new[]
        {
            "Penetration Testing", "Vulnerability Assessment", "Security Auditing",
            "Incident Response", "Threat Intelligence", "SIEM", "Security Operations Center (SOC)",
            "Malware Analysis", "Forensic Analysis", "Identity and Access Management (IAM)",
            "Single Sign-On (SSO)", "Multi-Factor Authentication (MFA)", "OAuth/OIDC",
            "Zero Trust Security", "Endpoint Security", "Network Security", "Application Security",
            "Cloud Security", "Container Security", "API Security", "Encryption",
            "PKI", "Certificate Management", "Security Architecture", "Risk Assessment",
            "Security Compliance", "Security Awareness Training", "Bug Bounty", "Red Team/Blue Team",
            "OWASP Top 10", "Secure Code Review", "DevSecOps", "Security Information Management"
        };
        AddSkills(cyberSecurity, SkillCategory.CyberSecurity);

        // ==================== SECURITY CLEARANCES ====================
        var securityClearances = new[]
        {
            // DoD Clearances
            "Top Secret/SCI (TS/SCI)", "Top Secret (TS)", "Secret", "Confidential",
            "Public Trust - High Risk", "Public Trust - Moderate Risk", "Public Trust - Low Risk",
            // DoE Clearances
            "DOE Q Clearance", "DOE L Clearance",
            // Special Access
            "Special Access Program (SAP)", "Sensitive Compartmented Information (SCI)",
            "NATO Secret", "CNWDI", "COMSEC",
            // Investigation Types
            "Single Scope Background Investigation (SSBI)", "National Agency Check (NAC)",
            "Background Investigation (BI)", "Periodic Reinvestigation (PR)"
        };
        AddSkills(securityClearances, SkillCategory.SecurityClearance);

        // ==================== COMPLIANCE ====================
        var compliance = new[]
        {
            "NIST Cybersecurity Framework", "NIST 800-53", "NIST 800-171",
            "Risk Management Framework (RMF)", "FedRAMP", "FedRAMP High", "FedRAMP Moderate",
            "CMMC Level 1", "CMMC Level 2", "CMMC Level 3", "FISMA", "FIPS 140-2/3",
            "DISA STIGs", "ATO Process", "DFARS 252.204-7012",
            "SOC 1", "SOC 2 Type I", "SOC 2 Type II", "ISO 27001", "ISO 27002", "ISO 27017", "ISO 27018",
            "PCI DSS", "HIPAA", "HITRUST", "GDPR", "CCPA", "SOX Compliance",
            "ITAR", "EAR", "CUI Handling", "Controlled Unclassified Information (CUI)",
            "Supply Chain Risk Management (SCRM)", "Zero Trust Architecture"
        };
        AddSkills(compliance, SkillCategory.Compliance);

        // ==================== DATA ANALYTICS ====================
        var dataAnalytics = new[]
        {
            "Data Analysis", "Statistical Analysis", "Predictive Analytics", "Descriptive Analytics",
            "Python Data Stack (Pandas, NumPy, SciPy)", "R Programming", "Jupyter Notebooks",
            "Data Visualization", "Data Cleaning", "Data Wrangling", "Feature Engineering",
            "A/B Testing", "Cohort Analysis", "Regression Analysis", "Time Series Analysis",
            "Excel Advanced Analytics", "Google Analytics", "Adobe Analytics", "Mixpanel",
            "Amplitude", "Heap Analytics", "Mode Analytics", "Apache Spark",
            "Apache Kafka", "Apache Airflow", "dbt (data build tool)", "Data Pipelines"
        };
        AddSkills(dataAnalytics, SkillCategory.DataAnalytics);

        // ==================== MACHINE LEARNING ====================
        var machineLearning = new[]
        {
            "Machine Learning", "Deep Learning", "Natural Language Processing (NLP)",
            "Computer Vision", "TensorFlow", "PyTorch", "Keras", "scikit-learn",
            "XGBoost", "LightGBM", "Neural Networks", "Convolutional Neural Networks (CNN)",
            "Recurrent Neural Networks (RNN)", "Transformers", "BERT", "GPT Models",
            "Large Language Models (LLM)", "Prompt Engineering", "RAG (Retrieval Augmented Generation)",
            "Model Training", "Model Deployment", "MLOps", "Feature Stores", "Model Monitoring",
            "AutoML", "Reinforcement Learning", "Recommendation Systems", "Anomaly Detection",
            "Hugging Face", "OpenAI API", "Claude API", "LangChain", "Vector Databases"
        };
        AddSkills(machineLearning, SkillCategory.MachineLearning);

        // ==================== BUSINESS INTELLIGENCE ====================
        var businessIntelligence = new[]
        {
            "Power BI", "Tableau", "Looker", "Qlik Sense", "QlikView", "MicroStrategy",
            "SAP BusinessObjects", "IBM Cognos", "Sisense", "Domo", "ThoughtSpot",
            "Dashboard Design", "Report Development", "KPI Development", "Data Storytelling",
            "Executive Reporting", "Self-Service BI", "Embedded Analytics", "DAX",
            "Power Query", "Calculated Fields", "Data Modeling for BI", "OLAP Cubes"
        };
        AddSkills(businessIntelligence, SkillCategory.BusinessIntelligence);

        // ==================== UX DESIGN ====================
        var uxDesign = new[]
        {
            "User Experience Design", "User Research", "Usability Testing", "User Interviews",
            "Persona Development", "Journey Mapping", "Information Architecture", "Wireframing",
            "Prototyping", "Interaction Design", "Accessibility (WCAG)", "Section 508 Compliance",
            "Heuristic Evaluation", "Card Sorting", "Tree Testing", "A/B Testing (UX)",
            "Design Thinking", "Human-Centered Design", "Service Design", "Voice UI Design",
            "Mobile UX", "Responsive Design", "Design Systems", "Atomic Design"
        };
        AddSkills(uxDesign, SkillCategory.UXDesign);

        // ==================== UI DESIGN ====================
        var uiDesign = new[]
        {
            "Visual Design", "Typography", "Color Theory", "Layout Design", "Iconography",
            "Illustration", "Motion Design", "Micro-interactions", "Brand Design",
            "Design System Development", "Component Libraries", "Style Guides",
            "Responsive UI Design", "Mobile-First Design", "Web Design", "App Design"
        };
        AddSkills(uiDesign, SkillCategory.UIDesign);

        // ==================== DESIGN TOOLS ====================
        var designTools = new[]
        {
            "Figma", "Sketch", "Adobe XD", "InVision", "Axure RP", "Balsamiq",
            "Adobe Photoshop", "Adobe Illustrator", "Adobe After Effects", "Adobe Premiere Pro",
            "Adobe InDesign", "Canva", "Framer", "Principle", "Zeplin", "Abstract",
            "Miro", "FigJam", "Whimsical", "Lucidchart", "Draw.io", "Storybook"
        };
        AddSkills(designTools, SkillCategory.DesignTools);

        // ==================== PROJECT MANAGEMENT ====================
        var projectManagement = new[]
        {
            "Project Planning", "Project Scheduling", "Resource Management", "Risk Management",
            "Budget Management", "Stakeholder Management", "Scope Management", "Quality Management",
            "Change Management", "Program Management", "Portfolio Management", "PMO Operations",
            "Earned Value Management (EVM)", "Critical Path Method", "Work Breakdown Structure (WBS)",
            "Gantt Charts", "PERT Charts", "Microsoft Project", "Smartsheet", "Monday.com",
            "Wrike", "Basecamp", "ClickUp", "Notion", "Asana", "Trello",
            "Government Contracting", "Contract Management", "Proposal Writing", "Cost Estimation",
            "Integrated Master Schedule (IMS)", "Integrated Master Plan (IMP)"
        };
        AddSkills(projectManagement, SkillCategory.ProjectManagement);

        // ==================== AGILE METHODOLOGY ====================
        var agileMethodology = new[]
        {
            "Agile", "Scrum", "Kanban", "SAFe (Scaled Agile Framework)", "LeSS",
            "Disciplined Agile", "Extreme Programming (XP)", "Lean", "Sprint Planning",
            "Sprint Retrospectives", "Daily Standups", "Backlog Refinement", "User Stories",
            "Story Points", "Velocity Tracking", "Burndown Charts", "Burnup Charts",
            "JIRA Administration", "Confluence Administration", "Azure Boards",
            "Rally", "VersionOne", "Agile Coaching", "Scrum Master", "Product Owner Skills"
        };
        AddSkills(agileMethodology, SkillCategory.AgileMethodology);

        // ==================== LEADERSHIP ====================
        var leadership = new[]
        {
            "Team Leadership", "People Management", "Performance Management", "Mentoring",
            "Coaching", "Conflict Resolution", "Decision Making", "Strategic Planning",
            "Organizational Development", "Culture Building", "Talent Acquisition",
            "Employee Development", "Succession Planning", "Executive Leadership",
            "Cross-Functional Leadership", "Remote Team Management", "Change Leadership",
            "Servant Leadership", "Transformational Leadership", "Situational Leadership"
        };
        AddSkills(leadership, SkillCategory.Leadership);

        // ==================== DEFENSE / DOD ====================
        var defenseDoD = new[]
        {
            // Systems & Programs
            "DoD Acquisition Process", "PPBE Process", "Defense Industrial Base",
            "Military Operations", "Joint Operations", "COCOM Support", "CENTCOM", "INDOPACOM",
            "EUCOM", "AFRICOM", "NORTHCOM", "SOUTHCOM", "SOCOM", "CYBERCOM", "SPACECOM",
            // Technical
            "DoD Cloud (milCloud)", "SIPR Systems", "NIPR Systems", "JWICS",
            "DoD Enterprise Services", "Defense Information Systems Agency (DISA)",
            // Administrative
            "ATAAPS", "Defense Travel System (DTS)", "Wide Area Workflow (WAWF)",
            "Deltek Costpoint", "Unanet", "DCAA Compliance", "DCMA Compliance",
            "DFARS Compliance", "Federal Acquisition Regulation (FAR)",
            "Defense Federal Acquisition Regulation Supplement (DFARS)",
            // Functional Areas
            "Military Logistics", "Defense Supply Chain", "Weapons Systems",
            "Command and Control (C2)", "Intelligence Operations", "Signals Intelligence (SIGINT)",
            "Human Intelligence (HUMINT)", "Geospatial Intelligence (GEOINT)",
            "Electronic Warfare", "Cyber Operations", "Space Operations"
        };
        AddSkills(defenseDoD, SkillCategory.DefenseDoD);

        // ==================== STRATEGY CONSULTING ====================
        var strategyConsulting = new[]
        {
            "Strategic Planning", "Business Strategy", "Corporate Strategy", "Digital Strategy",
            "IT Strategy", "Technology Roadmapping", "Market Analysis", "Competitive Analysis",
            "SWOT Analysis", "Porter's Five Forces", "Business Model Canvas", "Value Chain Analysis",
            "Scenario Planning", "Strategic Visioning", "Goal Setting (OKRs)", "Balanced Scorecard",
            "Business Case Development", "ROI Analysis", "Cost-Benefit Analysis",
            "Organizational Design", "Operating Model Design", "Process Improvement",
            "Benchmarking", "Best Practices Development", "Industry Analysis",
            "M&A Due Diligence", "Post-Merger Integration", "Change Management Consulting",
            "Management Consulting", "Executive Advisory", "Board Presentations"
        };
        AddSkills(strategyConsulting, SkillCategory.StrategyConsulting);

        // ==================== IT OPERATIONS ====================
        var itOperations = new[]
        {
            "IT Service Management (ITSM)", "ITIL Framework", "ServiceNow", "Jira Service Management",
            "Incident Management", "Problem Management", "Change Management (ITIL)",
            "Configuration Management", "Service Desk Operations", "Help Desk Support",
            "Tier 1/2/3 Support", "Technical Support", "End User Support",
            "Asset Management", "IT Asset Lifecycle", "Software Asset Management (SAM)",
            "Patch Management", "Endpoint Management", "Mobile Device Management (MDM)",
            "Desktop Support", "Remote Support", "IT Documentation", "Knowledge Management",
            "Service Level Management (SLM)", "Vendor Management", "IT Procurement",
            "Enterprise Architecture", "TOGAF", "Zachman Framework", "IT Governance",
            "IT Operations Analytics", "AIOps", "Observability"
        };
        AddSkills(itOperations, SkillCategory.ITOperations);

        // ==================== LOGISTICS ====================
        var logistics = new[]
        {
            "Supply Chain Management", "Logistics Planning", "Inventory Management",
            "Warehouse Management", "Distribution Management", "Transportation Management",
            "Fleet Management", "Procurement", "Sourcing", "Supplier Management",
            "Demand Planning", "Forecasting", "Materials Requirements Planning (MRP)",
            "Enterprise Resource Planning (ERP)", "SAP", "Oracle ERP", "JD Edwards",
            "Warehouse Management Systems (WMS)", "Transportation Management Systems (TMS)",
            "Order Fulfillment", "Last Mile Delivery", "Reverse Logistics",
            "Lean Supply Chain", "Just-in-Time (JIT)", "Supply Chain Optimization",
            "Supply Chain Analytics", "Supply Chain Risk Management", "Global Logistics",
            "Import/Export Compliance", "Customs Brokerage", "International Trade"
        };
        AddSkills(logistics, SkillCategory.Logistics);

        // ==================== FINANCE & ACCOUNTING ====================
        var financeAccounting = new[]
        {
            "Financial Analysis", "Financial Modeling", "Financial Planning & Analysis (FP&A)",
            "Budgeting", "Forecasting", "Variance Analysis", "Cost Accounting",
            "Management Accounting", "Government Accounting", "GAAP", "IFRS",
            "Accounts Payable", "Accounts Receivable", "General Ledger", "Month-End Close",
            "Financial Reporting", "SEC Reporting", "Audit Support", "Internal Controls",
            "Revenue Recognition", "Cost Allocation", "Indirect Rate Development",
            "Incurred Cost Submission", "Contract Pricing", "Proposal Pricing",
            "QuickBooks", "Sage", "NetSuite", "Workday", "SAP Finance",
            "Oracle Financials", "Deltek GCS Premier", "Unanet Financials"
        };
        AddSkills(financeAccounting, SkillCategory.FinanceAccounting);

        // ==================== BUSINESS SOFTWARE ====================
        var businessSoftware = new[]
        {
            "Microsoft 365", "Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint",
            "Microsoft Outlook", "Microsoft Access", "Microsoft Visio", "Microsoft Publisher",
            "Google Workspace", "Google Docs", "Google Sheets", "Google Slides",
            "Salesforce", "Salesforce Administration", "Salesforce Development",
            "HubSpot", "Zoho CRM", "Dynamics 365", "SAP ERP", "Oracle EBS",
            "DocuSign", "Adobe Acrobat", "SharePoint", "SharePoint Online",
            "Power Platform", "Power Automate", "Power Apps", "Power Virtual Agents"
        };
        AddSkills(businessSoftware, SkillCategory.BusinessSoftware);

        // ==================== COLLABORATION TOOLS ====================
        var collaborationTools = new[]
        {
            "Microsoft Teams", "Slack", "Zoom", "Google Meet", "Webex", "GoToMeeting",
            "Confluence", "Notion", "Coda", "Airtable", "SharePoint Collaboration",
            "OneDrive", "Google Drive", "Dropbox", "Box",
            "Miro", "Mural", "JIRA", "Trello", "Asana",
            "Basecamp", "ClickUp", "Linear", "GitHub Projects", "Azure Boards"
        };
        AddSkills(collaborationTools, SkillCategory.CollaborationTools);

        // ==================== COMMUNICATION ====================
        var communication = new[]
        {
            "Technical Writing", "Business Writing", "Proposal Writing", "Grant Writing",
            "Documentation", "Report Writing", "Executive Summaries", "White Papers",
            "Presentation Skills", "Public Speaking", "Stakeholder Communication",
            "Client Communication", "Cross-Cultural Communication", "Negotiation",
            "Facilitation", "Meeting Management", "Workshop Facilitation",
            "Training Development", "Instructional Design", "E-Learning Development"
        };
        AddSkills(communication, SkillCategory.Communication);

        // ==================== LANGUAGES ====================
        var languages = new[]
        {
            "English (Native)", "English (Professional)", "Spanish", "French", "German",
            "Italian", "Portuguese", "Russian", "Chinese (Mandarin)", "Chinese (Cantonese)",
            "Japanese", "Korean", "Arabic", "Hebrew", "Hindi", "Urdu", "Farsi/Persian",
            "Turkish", "Vietnamese", "Thai", "Indonesian", "Tagalog", "Polish",
            "Dutch", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Ukrainian"
        };
        AddSkills(languages, SkillCategory.Language);

        // ==================== CERTIFICATIONS (as Skills) ====================
        var certifications = new[]
        {
            // Project Management
            "PMP (Project Management Professional)", "CAPM", "PMI-ACP", "PgMP",
            "PRINCE2 Foundation", "PRINCE2 Practitioner",
            // Agile
            "Certified ScrumMaster (CSM)", "Certified Scrum Product Owner (CSPO)",
            "SAFe Agilist (SA)", "SAFe Practitioner (SP)", "SAFe Scrum Master (SSM)",
            "Professional Scrum Master (PSM I/II/III)", "ICAgile Certified Professional",
            // AWS
            "AWS Certified Cloud Practitioner", "AWS Certified Solutions Architect - Associate",
            "AWS Certified Solutions Architect - Professional", "AWS Certified Developer - Associate",
            "AWS Certified DevOps Engineer - Professional", "AWS Certified SysOps Administrator",
            "AWS Certified Security - Specialty", "AWS Certified Database - Specialty",
            // Azure
            "Azure Fundamentals (AZ-900)", "Azure Administrator (AZ-104)",
            "Azure Developer (AZ-204)", "Azure Solutions Architect (AZ-305)",
            "Azure DevOps Engineer Expert (AZ-400)", "Azure Security Engineer (AZ-500)",
            "Azure Data Engineer (DP-203)", "Azure AI Engineer (AI-102)",
            // GCP
            "Google Cloud Professional Cloud Architect", "Google Cloud Professional Data Engineer",
            "Google Cloud Professional DevOps Engineer", "Google Cloud Associate Cloud Engineer",
            // Security
            "CISSP", "CISM", "CISA", "CEH (Certified Ethical Hacker)", "CompTIA Security+",
            "CompTIA CySA+", "CompTIA CASP+", "CCSP", "OSCP", "GIAC Certifications",
            // IT/Infrastructure
            "CompTIA A+", "CompTIA Network+", "CompTIA Linux+", "CompTIA Server+",
            "CCNA", "CCNP", "CCIE", "MCSE", "RHCSA", "RHCE",
            // ITIL
            "ITIL 4 Foundation", "ITIL 4 Managing Professional", "ITIL 4 Strategic Leader",
            // Data
            "Certified Data Professional (CDP)", "Certified Analytics Professional (CAP)",
            "Google Data Analytics Certificate", "Databricks Certified",
            // Other
            "Six Sigma Green Belt", "Six Sigma Black Belt", "Lean Six Sigma",
            "TOGAF Certified", "Salesforce Certified Administrator", "ServiceNow Certified"
        };
        AddSkills(certifications, SkillCategory.Certification);

        Console.WriteLine($"Total unique skills prepared: {allSkills.Count}");
        return allSkills;
    }

    private static List<Certification> GetAllCertifications()
    {
        var now = DateTime.UtcNow;
        var certifications = new List<(string Name, string Issuer)>
        {
            // Project Management
            ("Project Management Professional (PMP)", "Project Management Institute (PMI)"),
            ("Certified Associate in Project Management (CAPM)", "Project Management Institute (PMI)"),
            ("PMI Agile Certified Practitioner (PMI-ACP)", "Project Management Institute (PMI)"),
            ("Program Management Professional (PgMP)", "Project Management Institute (PMI)"),
            ("PRINCE2 Foundation", "AXELOS"),
            ("PRINCE2 Practitioner", "AXELOS"),

            // Agile/Scrum
            ("Certified ScrumMaster (CSM)", "Scrum Alliance"),
            ("Certified Scrum Product Owner (CSPO)", "Scrum Alliance"),
            ("Certified Scrum Developer (CSD)", "Scrum Alliance"),
            ("SAFe Agilist (SA)", "Scaled Agile, Inc."),
            ("SAFe Practitioner (SP)", "Scaled Agile, Inc."),
            ("SAFe Scrum Master (SSM)", "Scaled Agile, Inc."),
            ("SAFe Product Owner/Product Manager (POPM)", "Scaled Agile, Inc."),
            ("SAFe Release Train Engineer (RTE)", "Scaled Agile, Inc."),
            ("Professional Scrum Master I (PSM I)", "Scrum.org"),
            ("Professional Scrum Master II (PSM II)", "Scrum.org"),
            ("Professional Scrum Product Owner I (PSPO I)", "Scrum.org"),

            // AWS
            ("AWS Certified Cloud Practitioner", "Amazon Web Services"),
            ("AWS Certified Solutions Architect - Associate", "Amazon Web Services"),
            ("AWS Certified Solutions Architect - Professional", "Amazon Web Services"),
            ("AWS Certified Developer - Associate", "Amazon Web Services"),
            ("AWS Certified DevOps Engineer - Professional", "Amazon Web Services"),
            ("AWS Certified SysOps Administrator - Associate", "Amazon Web Services"),
            ("AWS Certified Security - Specialty", "Amazon Web Services"),
            ("AWS Certified Database - Specialty", "Amazon Web Services"),
            ("AWS Certified Machine Learning - Specialty", "Amazon Web Services"),
            ("AWS Certified Advanced Networking - Specialty", "Amazon Web Services"),

            // Azure
            ("Azure Fundamentals (AZ-900)", "Microsoft"),
            ("Azure Administrator Associate (AZ-104)", "Microsoft"),
            ("Azure Developer Associate (AZ-204)", "Microsoft"),
            ("Azure Solutions Architect Expert (AZ-305)", "Microsoft"),
            ("Azure DevOps Engineer Expert (AZ-400)", "Microsoft"),
            ("Azure Security Engineer Associate (AZ-500)", "Microsoft"),
            ("Azure Data Engineer Associate (DP-203)", "Microsoft"),
            ("Azure AI Engineer Associate (AI-102)", "Microsoft"),
            ("Azure Database Administrator Associate (DP-300)", "Microsoft"),
            ("Microsoft 365 Certified: Enterprise Administrator Expert", "Microsoft"),

            // Google Cloud
            ("Google Cloud Associate Cloud Engineer", "Google Cloud"),
            ("Google Cloud Professional Cloud Architect", "Google Cloud"),
            ("Google Cloud Professional Data Engineer", "Google Cloud"),
            ("Google Cloud Professional DevOps Engineer", "Google Cloud"),
            ("Google Cloud Professional Cloud Security Engineer", "Google Cloud"),
            ("Google Cloud Professional Machine Learning Engineer", "Google Cloud"),

            // Security
            ("Certified Information Systems Security Professional (CISSP)", "ISC2"),
            ("Certified Information Security Manager (CISM)", "ISACA"),
            ("Certified Information Systems Auditor (CISA)", "ISACA"),
            ("Certified Ethical Hacker (CEH)", "EC-Council"),
            ("CompTIA Security+", "CompTIA"),
            ("CompTIA CySA+", "CompTIA"),
            ("CompTIA CASP+", "CompTIA"),
            ("CompTIA PenTest+", "CompTIA"),
            ("Certified Cloud Security Professional (CCSP)", "ISC2"),
            ("Offensive Security Certified Professional (OSCP)", "Offensive Security"),
            ("GIAC Security Essentials (GSEC)", "GIAC"),
            ("GIAC Certified Enterprise Defender (GCED)", "GIAC"),
            ("GIAC Certified Incident Handler (GCIH)", "GIAC"),

            // IT/Infrastructure
            ("CompTIA A+", "CompTIA"),
            ("CompTIA Network+", "CompTIA"),
            ("CompTIA Linux+", "CompTIA"),
            ("CompTIA Server+", "CompTIA"),
            ("CompTIA Cloud+", "CompTIA"),
            ("Cisco Certified Network Associate (CCNA)", "Cisco"),
            ("Cisco Certified Network Professional (CCNP)", "Cisco"),
            ("Cisco Certified Internetwork Expert (CCIE)", "Cisco"),
            ("Red Hat Certified System Administrator (RHCSA)", "Red Hat"),
            ("Red Hat Certified Engineer (RHCE)", "Red Hat"),
            ("VMware Certified Professional (VCP)", "VMware"),

            // ITIL
            ("ITIL 4 Foundation", "AXELOS"),
            ("ITIL 4 Managing Professional (MP)", "AXELOS"),
            ("ITIL 4 Strategic Leader (SL)", "AXELOS"),
            ("ITIL 4 Master", "AXELOS"),

            // Data & Analytics
            ("Certified Data Professional (CDP)", "ICCP"),
            ("Certified Analytics Professional (CAP)", "INFORMS"),
            ("Google Data Analytics Professional Certificate", "Google"),
            ("Databricks Certified Data Engineer Associate", "Databricks"),
            ("Databricks Certified Machine Learning Professional", "Databricks"),
            ("Snowflake SnowPro Core Certification", "Snowflake"),

            // Quality & Process
            ("Six Sigma Green Belt", "ASQ / IASSC"),
            ("Six Sigma Black Belt", "ASQ / IASSC"),
            ("Lean Six Sigma Green Belt", "IASSC"),
            ("Lean Six Sigma Black Belt", "IASSC"),

            // Enterprise Architecture
            ("TOGAF 9 Certified", "The Open Group"),
            ("TOGAF Enterprise Architecture Practitioner", "The Open Group"),
            ("Zachman Certified Enterprise Architect", "Zachman International"),

            // Other
            ("Salesforce Certified Administrator", "Salesforce"),
            ("Salesforce Certified Platform Developer I", "Salesforce"),
            ("ServiceNow Certified System Administrator", "ServiceNow"),
            ("ServiceNow Certified Implementation Specialist", "ServiceNow"),
            ("Kubernetes Certified Administrator (CKA)", "CNCF"),
            ("Kubernetes Certified Application Developer (CKAD)", "CNCF"),
            ("Certified Kubernetes Security Specialist (CKS)", "CNCF"),
            ("HashiCorp Certified: Terraform Associate", "HashiCorp"),
            ("HashiCorp Certified: Vault Associate", "HashiCorp")
        };

        return certifications.Select(c => new Certification
        {
            Id = Guid.NewGuid(),
            Name = c.Name,
            Issuer = c.Issuer,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();
    }
}
