# Performance Guide - BNBGest

**Session 21 - Performance Testing & Optimization**  
**Date:** 12 avril 2026

---

## 📊 Performance Budgets

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor | Our Target |
|--------|------|-------------------|------|------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4s | > 4s | **< 2.5s** |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms | **< 100ms** |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 | **< 0.1** |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8s - 3s | > 3s | **< 1.8s** |
| **TTFB** (Time to First Byte) | < 800ms | 800ms - 1800ms | > 1800ms | **< 800ms** |
| **INP** (Interaction to Next Paint) | < 200ms | 200ms - 500ms | > 500ms | **< 200ms** |

### Lighthouse Scores

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| **Performance** | ≥ 90 | TBD | 🔄 |
| **Accessibility** | ≥ 95 | TBD | 🔄 |
| **Best Practices** | ≥ 90 | TBD | 🔄 |
| **SEO** | ≥ 95 | TBD | 🔄 |

### Bundle Size Budgets

| Resource | Budget | Current | Status |
|----------|--------|---------|--------|
| **Initial JS** | < 200 KB (gzipped) | TBD | 🔄 |
| **Total JS** | < 500 KB (gzipped) | TBD | 🔄 |
| **CSS** | < 50 KB (gzipped) | TBD | 🔄 |
| **Images** | Optimized (WebP/AVIF) | ✅ | ✅ |

---

## 🧪 Running Performance Tests

### Local Testing

```bash
# Run all performance tests
npm run test:performance

# Run specific performance tests
npm run test:perf

# Run Lighthouse CI
npm run lighthouse:local

# Analyze bundle sizes
npm run analyze:bundle
# Or with PowerShell
.\scripts\analyze-bundle.ps1
```

### CI/CD Testing

Performance tests run automatically on:
- Every PR to `main`
- Every commit to `main`
- Nightly builds

View results in GitHub Actions artifacts.

---

## 📈 Web Vitals Monitoring

### Client-Side Tracking

The `WebVitalsReporter` component automatically tracks:
- LCP, CLS, FCP, TTFB, INP
- Real user metrics (RUM)
- Sent to `/api/vitals` in production
- Logged to console in development

### Viewing Metrics

**Development:**
```bash
npm run dev
# Open browser console
# Navigate to pages
# See Web Vitals logged in real-time
```

**Production:**
```bash
# Metrics sent to /api/vitals
# View in server logs or analytics dashboard
```

---

## 🚀 Performance Optimizations

### Images

✅ **Implemented:**
- Next.js `Image` component with automatic optimization
- AVIF and WebP formats
- Lazy loading for off-screen images
- Responsive image sizes

```tsx
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

### Fonts

✅ **Implemented:**
- Google Fonts with `next/font`
- Font subsetting
- `font-display: swap` for FOIT prevention
- Preloaded font files

```typescript
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

### Code Splitting

✅ **Implemented:**
- Automatic code splitting by route
- Dynamic imports for heavy components
- Lazy loading with `React.lazy` and `Suspense`

```tsx
// Heavy component loaded only when needed
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
});
```

### CSS Optimization

✅ **Implemented:**
- Tailwind CSS with JIT mode
- PurgeCSS for unused styles
- CSS modules for component isolation
- Minification in production

### Bundle Optimization

✅ **Implemented:**
- Tree shaking for unused code
- Package import optimization (`lucide-react`, `framer-motion`)
- Server/client component separation
- External packages for server components

---

## 📊 Performance Monitoring Tools

### Lighthouse CI

**Configuration:** `.lighthouserc.js`

```bash
# Run locally
npm run lighthouse:local

# CI runs automatically
# View reports in GitHub Actions
```

**Thresholds:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+

### Bundle Analyzer

**Analyze bundle sizes:**

```bash
npm run analyze:bundle
```

Opens interactive visualization showing:
- Bundle composition
- Largest dependencies
- Code splitting effectiveness
- Optimization opportunities

### Chrome DevTools

**Performance Profiling:**
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with page
5. Stop recording
6. Analyze flame chart

**Coverage Analysis:**
1. Open DevTools
2. Cmd/Ctrl + Shift + P
3. Type "Coverage"
4. Start coverage
5. Navigate pages
6. See unused CSS/JS

---

## 🎯 Performance Checklist

### Before Deployment

- [ ] Run `npm run test:performance` - all tests pass
- [ ] Run `npm run lighthouse:local` - scores ≥ targets
- [ ] Run `npm run analyze:bundle` - sizes within budget
- [ ] Check Web Vitals in dev console
- [ ] Test on slow 3G network (Chrome DevTools)
- [ ] Test with CPU throttling (6x slowdown)
- [ ] Verify lazy loading works (Network tab)
- [ ] Check font loading (no FOIT/FOUT)
- [ ] Verify images use WebP/AVIF
- [ ] Check no layout shifts (CLS)

### After Deployment

- [ ] Monitor Web Vitals in production
- [ ] Check Lighthouse scores in CI
- [ ] Review bundle size trends
- [ ] Monitor TTFB from server logs
- [ ] Check Core Web Vitals in Search Console
- [ ] Set up performance alerts

---

## 🔧 Troubleshooting

### High LCP

**Causes:**
- Large images above the fold
- Render-blocking resources
- Slow server response
- Client-side rendering

**Solutions:**
- Optimize/preload hero images
- Use `next/image` with priority
- Implement SSR/SSG
- Reduce server response time

### High CLS

**Causes:**
- Images without dimensions
- Dynamic content insertion
- Web fonts causing FOIT
- Ads without reserved space

**Solutions:**
- Always set width/height on images
- Reserve space for dynamic content
- Use `font-display: swap`
- Reserve space for ads

### Large Bundles

**Causes:**
- Importing entire libraries
- Duplicate dependencies
- Large third-party scripts
- No code splitting

**Solutions:**
- Use tree-shakeable imports
- Analyze bundle with analyzer
- Dynamic imports for heavy features
- Remove unused dependencies

---

## 📚 Resources

### Documentation
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

### Tools
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report)

### Benchmarks
- [HTTP Archive](https://httparchive.org/)
- [Real User Experience](https://developer.chrome.com/docs/crux/)

---

## 🎯 Next Steps

1. **Establish Baseline** - Run tests and record current metrics
2. **Optimize Critical Path** - Improve LCP and FCP
3. **Eliminate Layout Shifts** - Achieve CLS < 0.1
4. **Monitor Continuously** - Set up alerts for regressions
5. **Iterate** - Regular performance reviews

---

**Last Updated:** April 12, 2026  
**Session:** 21 - Performance Testing  
**Status:** 🔄 In Progress
