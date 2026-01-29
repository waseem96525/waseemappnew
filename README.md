# 🛍️ Retail POS Application

A comprehensive, modern retail point-of-sale (POS) application built with vanilla JavaScript, HTML5, and CSS3. Features inventory management, customer tracking, sales analytics, and more.

## ✨ Features

- **📊 Dashboard**: Real-time sales analytics and inventory overview
- **🛒 Point of Sale**: Intuitive checkout system with cart management
- **📦 Inventory Management**: Add, edit, delete products with stock tracking
- **👥 Customer Management**: Customer database with purchase history
- **📈 Sales Reports**: Detailed transaction history and filtering
- **🔍 Search & Filter**: Advanced search across all data
- **🖨️ Print Invoices**: Professional invoice printing
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🌙 Dark Mode**: Modern dark/light theme toggle
- **💾 Local Storage**: Data persistence without backend
- **🔐 User Authentication**: Multi-user support with role management
- **📊 Forecasting**: Inventory forecasting and analytics
- **📧 External Integrations**: Email, SMS, and cloud backup support

## 🚀 Live Demo

[View Live Application](https://retail-pos-app.vercel.app)

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome icons
- **Storage**: Browser localStorage for data persistence
- **Deployment**: Vercel

## 📦 Installation & Setup

### Prerequisites
- Modern web browser with JavaScript enabled
- No server/backend required (runs entirely in browser)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/retail-pos-app.git
   cd retail-pos-app
   ```

2. **Start local server**
   ```bash
   # Using Python (recommended)
   python -m http.server 8000

   # Or using Node.js
   npx serve .
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 🚀 Deployment to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/retail-pos-app.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings
   - Click "Deploy"

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts**
   - Link to existing project or create new
   - Choose project name
   - Deploy

## 📁 Project Structure

```
retail-pos-app/
├── index.html          # Main application HTML
├── script.js           # Application logic and functionality
├── styles.css          # Styling and responsive design
├── package.json        # Project metadata
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## 🎯 Usage Guide

### First Time Setup
1. The app loads with sample data
2. Configure your shop settings in Settings > Shop
3. Add your products in Inventory section
4. Start processing sales!

### Key Workflows
- **Adding Products**: Inventory > Add Product
- **Processing Sales**: Use product buttons or search to add to cart
- **Managing Customers**: Customers section for history
- **Viewing Reports**: Reports section for analytics
- **Printing Invoices**: Click Print on any transaction

## 🔧 Configuration

### Shop Settings
- Shop name, address, phone, email
- GST number and logo
- Invoice customization

### Invoice Settings
- Invoice numbering prefix
- Show/hide logo and GST
- Custom footer text

## 🌟 Key Features Explained

### Smart Inventory Management
- Real-time stock tracking
- Low stock alerts
- Barcode/SKU support
- Quick keys (1-9) for fast access

### Advanced Analytics
- Sales trends and forecasting
- Category-wise performance
- Customer analytics
- Inventory turnover analysis

### Multi-User Support
- User authentication
- Role-based permissions
- Activity logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Ensure JavaScript is enabled
3. Clear browser cache and localStorage if needed
4. Check the Issues section on GitHub

## 🔄 Updates

The application uses localStorage for data persistence, so updates won't affect your data. However, always backup important data before major updates.

---

**Built with ❤️ for modern retail businesses**