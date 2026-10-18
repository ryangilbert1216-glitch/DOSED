# Peptide Protocol

Local desktop app to track your live peptide stack, doses, reconstitution math, and injection log.

## The Fridge

**The Fridge** is the home screen — a visual shelf of every peptide you’re actively taking. Tap a vial to edit dose, reconstitution, schedule, and notes. Archived peptides leave the fridge.

## Run it

```bash
npm install
npm run dev:desktop
```

Browser-only (no Electron window):

```bash
npm run dev
```

## Features

- Fridge of live vials
- Reconstitution → insulin syringe units
- Today protocol checklist
- Injection log
- Desktop reminders (Electron notifications)

Data stays in local storage on your machine.
