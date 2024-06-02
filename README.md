# Identity Reconciliation Service

This project is a backend service designed to identify and keep track of a customer's identity across multiple purchases. It is built using NestJS, Node.js, TypeScript, Prisma ORM, and PostgreSQL.

## Hosted Service

The service is hosted and can be accessed at:
[https://identity-reconciliation-kobo.onrender.com/identify](https://identity-reconciliation-kobo.onrender.com/identify)

## Tech Stack

- **Backend Framework**: NestJS with Node.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL

## Endpoint

### /identify

**Method**: `POST`

**Request Body**:
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
**Response**:
```json
{
  "contact": {
    "primaryContactId":  ["number"]
    "emails": ["string"],
    "phoneNumbers": ["string"],
    "secondaryContactIds": ["number"]
  }
}
```


Running the Project Locally
To run this project locally, follow these steps:
1. Clone the Repository
```bash
git clone https://github.com/Asmirkhan007/Identity-Reconciliation.git
cd Identity-Reconciliation
```

2. Install Dependencies
```bash
npm install
```
3. Set Up Environment Variables
Create a `.env` file in the root directory and add your database connection details:
```env
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>?schema=public"
```
4. Run Database Migrations
```bash
npx prisma migrate dev
```
5. Start the Server
```bash
npm run start
```
The server should now be running on ```http://localhost:3000```

## Project Structure
- `src/`
  - `app.controller.ts`: Controller handling the `/identify` endpoint.
  - `app.service.ts`: Service containing the business logic for identity reconciliation.
  - `main.ts`: Main entry point of the application.
  - `prisma/`: Directory containing Prisma schema and migrations.

## Contact
For any inquiries or issues, please contact:
- Asmir Khan: [asmirkhan7@gmail.com](mailto:asmirkhan7@gmail.com)
## License
This project is licensed under the MIT License.
