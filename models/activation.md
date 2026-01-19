## Activation Domain – Conceptual Overview

The activation domain models all intentional digital interventions introduced to influence user behaviour, guide decision-making, or stimulate progression within a digital journey. It represents the layer where the platform actively reaches out to a user, as opposed to passively observing what the user does.

This domain is explicitly **channel-agnostic** and **business-neutral**. It does not encode where an activation is delivered (website, app, email, push), nor does it define the business outcome it leads to (lead, conversion, transaction). Instead, it focuses on the **mechanics of activation itself**: grouping, placement, decisioning, and observable interaction.

The activation domain is designed as a **foundational capability layer**. It can be reused across multiple delivery channels and composed into higher-level business domains such as `realEstatePortal`, where business meaning and outcomes are interpreted.

---

## Core Concepts and Responsibilities

The activation domain answers the following questions:

- What activation units exist?
- Where can they appear?
- Why are they grouped together?
- How are they selected or varied?
- How does a user interact with them?

It deliberately avoids answering:
- What business result did this cause?
- What is the user’s intent?
- How successful was this activation?

Those interpretations belong to higher-level domains.

---

## Touchpoint

A **touchpoint** is the concrete activation unit that is delivered to a user. Examples include banners, nudges, modals, inline cards, push notifications, or any other activation element that can be rendered and interacted with.

Touchpoints are:
- Concrete and observable
- Identified by a stable `touchpointId`
- Grouped under campaigns
- Placed on surfaces
- Optionally influenced by experiments and variants

A touchpoint itself does not carry business intent. It is simply *what* is shown.

### Touchpoint Actions

Touchpoints expose observable actions that describe their lifecycle from the user’s perspective:

- **viewed** – the touchpoint became visible to the subject
- **engaged** – the subject interacted with the touchpoint
- **dismissed** – the subject explicitly closed or rejected the touchpoint
- **snoozed** – the subject postponed the touchpoint for later

These actions are observational: they describe what happened, not what it means.

---

## Surface

A **surface** represents a stable, conceptual placement within a digital experience where touchpoints can appear.

A surface is not:
- a page
- a screen
- a component
- a layout or DOM element

Instead, it is an abstraction that answers the question:

> “In which logical place in the experience could an activation be shown?”

Examples:
- homepage hero
- property detail sidebar
- search results inline slot
- onboarding step
- app home top section

Surfaces are designed to remain stable over time, even as pages, screens, or UI components change. This stability enables consistent decisioning, experimentation, and analysis across redesigns and channels.

Surfaces act as a **contract** between activation logic and delivery layers.

---

## Campaign

A **campaign** is an identifier that groups touchpoints under a shared activation intent.

In this model, campaigns:
- may be created dynamically
- may not be pre-registered
- are observed from live traffic
- act as grouping labels rather than managed entities

A campaign does not represent a workflow or lifecycle. It simply provides a way to associate multiple touchpoints with a shared purpose or initiative.

### Campaign Observation

When a campaign identifier appears in activation traffic for the first time, it can be emitted as a `campaign.observed` event. This registers the campaign identifier and optionally captures descriptive metadata (such as name, objective, or type) as a snapshot at observation time.

Campaign metadata is intentionally modeled as **event context**, not as entity state. This ensures historical correctness even when campaign attributes change over time.

---

## Experiment and Variant

An **experiment** is a decisioning construct used to influence how activations are delivered. This includes experimentation, personalisation, rule-based decisioning, or recommendation logic.

A **variant** represents a specific decisioning outcome within an experiment.

In this model:
- experiments and variants are lightweight entities
- they primarily serve as identifiers
- they do not require explicit lifecycle events
- they are attached to touchpoint interactions as metadata

Variants are treated as **decisioning metadata at event time**, not as fully managed domain objects. This avoids unnecessary overhead while still enabling robust analysis downstream.

---

## Subject

A **subject** represents the abstract actor that experiences and interacts with activation touchpoints.

The subject:
- may be anonymous or known
- may represent a user, visitor, or profile
- is the actor performing touchpoint actions

Subject identity resolution and enrichment are considered integration concerns and are intentionally kept outside the activation domain. Activation only requires a stable `subjectId` to correlate interactions.

---

## Event Semantics

Activation events are:
- observational, not interpretative
- emitted at the moment an interaction occurs
- enriched with contextual metadata relevant at that moment

Contexts such as campaign name, objective, type, or delivery channel are captured as **snapshots**, ensuring that events remain historically accurate even when upstream configurations change.

The activation domain avoids:
- pre-declaration of campaigns, experiments, or variants
- excessive lifecycle events
- coupling to business outcome semantics

This keeps the event model lean, expressive, and resilient.

---

## Relationship to Other Domains

The activation domain is intentionally decoupled from delivery and business domains:

- **Delivery domains** (e.g. website, app) provide execution context such as pages, screens, or sessions.
- **Business domains** (e.g. realEstatePortal) interpret activation interactions in terms of journeys, intent, and outcomes.
- **Core domains** (e.g. realEstate) provide the business entities that activations may reference.

Activation acts as a horizontal enabler that can be safely composed with other domains without semantic leakage.

---

## Design Principles

- Channel-agnostic by design
- Observational rather than interpretative
- Stable abstractions over volatile implementations
- Minimal lifecycle overhead
- Explicit decisioning metadata
- Snapshot-based context for historical correctness

---

## Intended Use

This domain serves as reference documentation for:
- product teams designing activation strategies
- engineers implementing activation and decisioning logic
- data teams analysing activation effectiveness
- architects maintaining cross-domain consistency

It is intended as a shared vocabulary, not an implementation prescription.