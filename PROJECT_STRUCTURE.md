# Project Structure

This project is a static multi-page site. The codebase is organized around:

- root-level HTML page entry files
- shared partials in `components/`
- styles in `assets/css/`
- scripts in `assets/js/`

## Current Layout

```text
/
|-- index.html
|-- about.html
|-- blog.html
|-- blog_Details.html
|-- cart.html
|-- checkout.html
|-- collapse_services_details.html
|-- contact.html
|-- customer_details.html
|-- login.html
|-- order_success.html
|-- otp.html
|-- privacy.html
|-- service_details.html
|-- service_details_video.html
|-- services.html
|-- signUp.html
|-- terms.html
|-- welcome.html
|-- PROJECT_STRUCTURE.md
|-- assets/
|   |-- css/
|   |   |-- layout/
|   |   |   |-- footer.css
|   |   |   `-- header.css
|   |   |-- pages/
|   |   |   |-- about.css
|   |   |   |-- blog-details.css
|   |   |   |-- blog.css
|   |   |   |-- cart.css
|   |   |   |-- checkout.css
|   |   |   |-- collapse-service-details.css
|   |   |   |-- contact.css
|   |   |   |-- customer-details.css
|   |   |   |-- home-responsive.css
|   |   |   |-- home.css
|   |   |   |-- login.css
|   |   |   |-- order-success.css
|   |   |   |-- otp.css
|   |   |   |-- service-details.css
|   |   |   |-- services.css
|   |   |   |-- signup.css
|   |   |   `-- welcome.css
|   |   `-- legacy page/layout css copies still exist in `assets/css/`
|   |-- images/
|   `-- js/
|       |-- core/
|       |   |-- app.js
|       |   |-- components-loader.js
|       |   `-- home.js
|       `-- legacy script copies still exist in `assets/js/`
|-- components/
|   |-- layout/
|   |   |-- footer.html
|   |   `-- header.html
|   |-- sections/
|   |   `-- home/
|   |       |-- chooseUs.html
|   |       |-- faq.html
|   |       |-- heroSection.html
|   |       |-- impact.html
|   |       |-- map.html
|   |       |-- projectGallery.html
|   |       |-- stats.html
|   |       |-- testimonial.html
|   |       |-- topNotch.html
|   |       `-- works.html
|   `-- legacy `components/home/` copies still exist during transition
```

## Conventions

- Keep root HTML files as page entrypoints for simple static hosting.
- Put shared partials in `components/layout/` and `components/sections/`.
- Put shared layout CSS in `assets/css/layout/`.
- Put page-specific CSS in `assets/css/pages/`.
- Put active shared JavaScript in `assets/js/core/`.
- Keep images grouped by feature/content inside `assets/images/`.

## Notes

- The site currently includes both the newer organized structure and some legacy duplicate files for compatibility.
- Page files now mainly reference:
  - `assets/css/layout/`
  - `assets/css/pages/`
  - `assets/js/core/`
  - `components/layout/`
  - `components/sections/home/`
