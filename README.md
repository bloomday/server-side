# 🌸 Bloomday — Event Invitation & Engagement Platform

Bloomday is a full-stack event management platform designed to handle the complete lifecycle of event invitations, guest engagement, and contributions..

It was built and deployed for real-world usage, supporting live events with automated workflows, QR-based access, and secure RSVP handling.

---

## 🚀 Features

### 🎟 Event Management

* Create events with unique slugs
* Upload invitation card (IV) images
* Generate QR codes for event access

### 📩 Invitation System

* Token-based invite system (secure & unique per user)
* Accept / Decline RSVP flow
* Invite expiration logic (7-day expiry)
* Invite revocation handling

### 🔁 Automation

* Scheduled reminders before invite expiry / event day
* Automatic cleanup of expired invites
* Background jobs powered by cron

### 📱 QR Code Access

* Scan QR → View event
* Unified flow via `/invite/view/:token`

### 💳 Contributions / Payments

* Integrated payment system (Paystack / Stripe / PayPal)
* Payment verification via webhook
* Contribution tracking
* Automated receipt emails

### 📧 Email System

* Invite emails
* Reminder emails
* Verification emails
* Contribution receipts

### 🖼 Media Handling

* Cloudinary integration for:

  * Invitation cards (IV)
  * QR code images

---

## 🧱 Tech Stack

**Backend**

* Node.js (Express)
* MongoDB (Mongoose)

**Services**

* Cloudinary (media storage)
* Nodemailer (email service)
* node-cron (background jobs)

**Payments**

* Paystack / Stripe / PayPal

---

## 🧠 System Architecture

See full architecture diagram:

👉 [View Architecture](./docs/architecture.md)

This includes:

* Invite lifecycle
* QR flow
* Email workflows
* Payment system
* Cron automation

---

## 🔄 Core System Flow

### 1. Event Creation

* Host creates event
* System generates:

  * Unique slug
  * QR code
  * Optional IV image

---

### 2. Invitation Flow

* Tokens generated per invite
* Emails sent with:

  * RSVP links
  * QR codes
* Invite stored with expiry

---

### 3. Guest Interaction

* User:

  * Clicks link OR scans QR
  * Views event
  * Accepts / Declines
* System updates RSVP in real-time

---

### 4. Automation Layer

* Cron jobs:

  * Send reminders
  * Expire invites
  * Cleanup invalid records

---

### 5. Contribution Flow

* Guest makes contribution
* Payment verified via gateway
* Contribution stored
* Receipt email sent

---

## 📊 Real-World Usage

Bloomday was used in live environments:

* 💍 Wedding event
* 🏢 Brigade/community event

📈 50+ users onboarded
📈 Real invite distribution and RSVP tracking
📈 Automated reminders and engagement

---

## 👥 Contribution

This was a **collaborative full-stack project**.

**My role (Backend Engineering):**

* API design and implementation
* Invitation & RSVP system
* Email workflows
* QR code system
* Cron-based automation
* Payment integration

---

## ⚙️ Setup (Backend)

```bash
git clone <repo-url>
cd bloomday-backend
npm install
npm run dev
```

---

## 🔐 Environment Variables

```env
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=

GMAIL_USER=
GMAIL_PASS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

PAYSTACK_SECRET_KEY=
```

---

## 🔮 Future Improvements

* Admin dashboard analytics
* Real-time event tracking
* Multi-tenant SaaS architecture
* Notification system (push / SMS)
* Role-based access control

---

## 👨‍💻 Author

Michael Adekunle
Backend Engineer
