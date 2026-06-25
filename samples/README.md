# Sample import files

Anonymized test data for the **Data Intake — Provider Report Importer**. All names,
emails (`@example.com`), and phones (`555-01xx`) are fake — safe for the demo.

## `medcerts-sample.csv`
Mirrors the real MedCerts lead-report columns:
`First Name, Last Name, Company/Account, Lead Owner, Product, Create Date, Lead Status,
Priority Notes, Projected Enroll Date, Projected Start Date, Email, Phone`.

Exercises the whole flow:
- **No tenant column** — every row is "Focus Quest" (you assign the school on upload).
- **MedCerts status words** to map → stage: New, Contacted, Attempting Contact,
  Future Student, Hibernating, Inactive, Closed lost.
- **Versioned products** (e.g. `Medical Assistant (v24.10)` and `(v25.8)`) that map to
  the same catalog program.
- **Within-file duplicate**: the last row repeats `avery.stone@example.com` to show
  dedupe (it won't double-insert).

### Try it
1. Data Intake → upload this file, pick a school + source.
2. Confirm the auto-suggested column mapping; map the 7 statuses and the products.
3. Save the format, review the flagged preview, then Import.
4. Re-upload the same file → the saved format auto-applies and rows **update** instead
   of duplicating (upsert by email).
