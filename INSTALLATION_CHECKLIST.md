# ✅ MalaSafe Installation Checklist

Use this checklist to verify your MalaSafe installation is complete and working correctly.

---

## 📋 Pre-Installation Requirements

### Software Installation
- [ ] Python 3.9+ installed
  ```bash
  python --version
  ```
- [ ] Node.js 18+ installed
  ```bash
  node --version
  ```
- [ ] PostgreSQL 14+ installed
  ```bash
  psql --version
  ```
- [ ] Git installed (optional)
  ```bash
  git --version
  ```

---

## 🗄️ Database Setup

- [ ] PostgreSQL service is running
- [ ] Created database `malasafe`
  ```sql
  CREATE DATABASE malasafe;
  ```
- [ ] Database connection tested
  ```bash
  psql -U postgres -d malasafe
  ```

---

## 🔧 Backend Setup

### Environment Setup
- [ ] Navigated to backend directory
  ```bash
  cd backend
  ```
- [ ] Created virtual environment
  ```bash
  python -m venv venv
  ```
- [ ] Activated virtual environment
  ```bash
  # Windows
  venv\Scripts\activate
  # Linux/Mac
  source venv/bin/activate
  ```
- [ ] Installed dependencies
  ```bash
  pip install -r requirements.txt
  ```

### Configuration
- [ ] Copied `.env.example` to `.env`
  ```bash
  copy .env.example .env
  ```
- [ ] Updated `DATABASE_URL` in `.env`
- [ ] Updated `SECRET_KEY` in `.env`
- [ ] Updated `CORS_ORIGINS` in `.env`

### Database Initialization
- [ ] Ran Alembic migrations
  ```bash
  alembic upgrade head
  ```
- [ ] Created admin user
  ```bash
  python create_admin.py
  ```
- [ ] Verified admin credentials:
  - Email: `admin@malasafe.gov.et`
  - Password: `admin123`

### Backend Server
- [ ] Started backend server
  ```bash
  uvicorn app.main:app --reload
  ```
- [ ] Backend running at http://localhost:8000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Health check working at http://localhost:8000/health

---

## 🎨 Frontend Setup

### Environment Setup
- [ ] Opened new terminal
- [ ] Navigated to frontend directory
  ```bash
  cd frontend
  ```
- [ ] Installed dependencies
  ```bash
  npm install
  ```

### Configuration
- [ ] Copied `.env.local.example` to `.env.local`
  ```bash
  copy .env.local.example .env.local
  ```
- [ ] Updated `NEXT_PUBLIC_API_URL` in `.env.local`
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
  ```

### Frontend Server
- [ ] Started frontend server
  ```bash
  npm run dev
  ```
- [ ] Frontend running at http://localhost:3000
- [ ] No build errors in terminal

---

## 🧪 Functionality Testing

### Authentication
- [ ] Visit http://localhost:3000
- [ ] Redirects to `/login` page
- [ ] Login page displays correctly
- [ ] Enter admin credentials:
  - Email: `admin@malasafe.gov.et`
  - Password: `admin123`
- [ ] Login successful
- [ ] Redirects to `/dashboard`
- [ ] User info displays in header
- [ ] Logout button works

### Dashboard Page
- [ ] Dashboard loads without errors
- [ ] Statistics cards display
- [ ] Quick action buttons visible
- [ ] No console errors

### Upload Page
- [ ] Navigate to `/upload`
- [ ] Upload page loads
- [ ] Upload type selector works
- [ ] File input works
- [ ] Download template button works
- [ ] Template downloads successfully

### Analytics Page
- [ ] Navigate to `/analytics`
- [ ] Analytics page loads
- [ ] Trend type toggle works
- [ ] Data table displays (may be empty)
- [ ] Summary statistics show

### Maps Page
- [ ] Navigate to `/maps`
- [ ] Maps page loads
- [ ] Region filter works
- [ ] District list displays (may be empty)
- [ ] Legend shows

### Alerts Page
- [ ] Navigate to `/alerts`
- [ ] Alerts page loads
- [ ] Filter dropdowns work
- [ ] Alert list displays (may be empty)

### Settings Page
- [ ] Navigate to `/settings`
- [ ] Settings page loads
- [ ] User profile displays
- [ ] Account information shows

---

## 🔌 API Testing

### Health Check
- [ ] Visit http://localhost:8000/health
- [ ] Returns `{"status": "healthy"}`

### API Documentation
- [ ] Visit http://localhost:8000/docs
- [ ] Swagger UI loads
- [ ] All endpoints visible
- [ ] Can expand endpoint details

### Authentication Endpoints
- [ ] Test `/api/v1/auth/login` in Swagger
- [ ] Test `/api/v1/auth/me` in Swagger (with token)

### Analytics Endpoints
- [ ] Test `/api/v1/analytics/dashboard` in Swagger
- [ ] Test `/api/v1/analytics/trends` in Swagger

---

## 📊 Data Upload Testing

### Prepare Test Data
- [ ] Download malaria template from frontend
- [ ] Open template in Excel/CSV editor
- [ ] Add sample data:
  ```csv
  district_code,week,year,cases,deaths
  AA001,1,2026,45,2
  AA001,2,2026,52,3
  ```
- [ ] Save as CSV

### Upload Test
- [ ] Navigate to `/upload` page
- [ ] Select "Weekly Malaria Data"
- [ ] Choose test CSV file
- [ ] Click "Upload File"
- [ ] Upload succeeds
- [ ] Success message displays
- [ ] No validation errors

### Verify Upload
- [ ] Navigate to `/analytics`
- [ ] Data appears in trends table
- [ ] Navigate to `/dashboard`
- [ ] Statistics updated

---

## 🐛 Troubleshooting Checks

### Backend Issues
- [ ] Check backend terminal for errors
- [ ] Verify PostgreSQL is running
- [ ] Verify DATABASE_URL is correct
- [ ] Check port 8000 is not in use
- [ ] Try restarting backend server

### Frontend Issues
- [ ] Check frontend terminal for errors
- [ ] Verify backend is running
- [ ] Check browser console for errors
- [ ] Verify NEXT_PUBLIC_API_URL is correct
- [ ] Check port 3000 is not in use
- [ ] Try clearing browser cache
- [ ] Try restarting frontend server

### Database Issues
- [ ] Check PostgreSQL service status
- [ ] Verify database exists
- [ ] Check database credentials
- [ ] Try connecting with psql
- [ ] Check migrations are applied

### Network Issues
- [ ] Check firewall settings
- [ ] Verify CORS configuration
- [ ] Check localhost resolution
- [ ] Try different browser

---

## 📝 Optional Enhancements

### Sample Data
- [ ] Create sample districts
- [ ] Upload sample malaria data
- [ ] Upload sample climate data
- [ ] Generate sample predictions
- [ ] Create sample alerts

### Additional Users
- [ ] Create MOH officer user
- [ ] Create EPHI officer user
- [ ] Create regional officer user
- [ ] Test different role permissions

### shadcn/ui Components
- [ ] Initialize shadcn/ui
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Add UI components
  ```bash
  npx shadcn-ui@latest add button card input label select table badge alert
  ```

---

## 🎯 Final Verification

### Backend Checklist
- [ ] ✅ Backend server running
- [ ] ✅ Database connected
- [ ] ✅ Migrations applied
- [ ] ✅ Admin user created
- [ ] ✅ API docs accessible
- [ ] ✅ Health check working
- [ ] ✅ All endpoints responding

### Frontend Checklist
- [ ] ✅ Frontend server running
- [ ] ✅ All pages loading
- [ ] ✅ Authentication working
- [ ] ✅ Navigation working
- [ ] ✅ API integration working
- [ ] ✅ No console errors
- [ ] ✅ Responsive design working

### Integration Checklist
- [ ] ✅ Login flow complete
- [ ] ✅ Dashboard data loading
- [ ] ✅ Upload functionality working
- [ ] ✅ Analytics displaying
- [ ] ✅ Maps loading
- [ ] ✅ Alerts showing
- [ ] ✅ Settings accessible

---

## 🎉 Success Criteria

Your installation is complete when:

✅ Backend server runs without errors  
✅ Frontend server runs without errors  
✅ Login works with admin credentials  
✅ All pages load successfully  
✅ CSV upload works  
✅ Data displays in analytics  
✅ No critical errors in console  

---

## 📚 Next Steps

After successful installation:

1. **Read Documentation**
   - [ ] Review [QUICKSTART_FULL_STACK.md](QUICKSTART_FULL_STACK.md)
   - [ ] Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
   - [ ] Check [FRONTEND_COMPLETE.md](FRONTEND_COMPLETE.md)

2. **Customize System**
   - [ ] Add real district data
   - [ ] Upload historical malaria data
   - [ ] Configure email notifications (future)
   - [ ] Set up production environment

3. **User Management**
   - [ ] Create official user accounts
   - [ ] Assign appropriate roles
   - [ ] Test role-based access

4. **Data Management**
   - [ ] Import historical data
   - [ ] Set up regular data uploads
   - [ ] Configure backup schedule

5. **Deployment**
   - [ ] Set up production server
   - [ ] Configure domain name
   - [ ] Set up SSL certificate
   - [ ] Configure production database
   - [ ] Deploy backend
   - [ ] Deploy frontend

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Documentation**
   - Review relevant documentation files
   - Check API documentation at http://localhost:8000/docs

2. **Check Logs**
   - Backend terminal output
   - Frontend terminal output
   - Browser console (F12)
   - PostgreSQL logs

3. **Common Issues**
   - Port already in use → Change port
   - Database connection error → Check credentials
   - Module not found → Reinstall dependencies
   - CORS error → Check CORS_ORIGINS setting

4. **Resources**
   - FastAPI docs: https://fastapi.tiangolo.com/
   - Next.js docs: https://nextjs.org/docs
   - PostgreSQL docs: https://www.postgresql.org/docs/

---

## ✅ Installation Complete!

If all items are checked, your MalaSafe installation is complete and ready for use! 🎉

**Access your application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Login with:**
- Email: `admin@malasafe.gov.et`
- Password: `admin123`

---

**Happy monitoring! 🦟🛡️**
