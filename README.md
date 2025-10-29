# GitTempo

[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.0+-ff6384.svg)](https://www.chartjs.org)

A commit history visualization tool that analyzes GitHub repository activity patterns. Built with Next.js, TypeScript, and Chart.js.

## About

GitTempo fetches and visualizes commit data from public GitHub repositories. By analyzing the previous 500 commits, the application provides insights into repository development patterns, contributor activity, and project tempo through interactive charts and graphs.

## Features

**Repository Analysis**  
Enter any public GitHub repository URL to fetch and analyze its commit history. The application uses the GitHub API to retrieve the most recent 500 commits with detailed metadata.

**Commit Visualization**  
An Interactive chart powered by Chart.js display commit patterns over time. Visualizations include commit frequency, contributor activity, time-of-day patterns, and day-of-week distributions.

**Data Filtering**  
Filter visualizations by relevant attributes including date ranges, specific contributors, commit types, and time periods. Dynamically update charts based on selected filters.

**Commit Timeline**  
View commits chronologically with detailed information including author, timestamp, commit message, and file changes. 

**Contributor Insights**  
Analyze individual contributor patterns and activity levels. Compare contributions across team members and identify the most active contributors.

**Development Patterns**  
Identify peak development hours, most active days of the week, and commit frequency trends. Understand when and how development work happens.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Data Visualization**: Chart.js
- **API**: GitHub REST API
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18.0 or later
- GitHub personal access token (for API rate limits)

### Installation

1. Clone the repository
```bash
git clone https://github.com/cjuyematsu/GitTempo.git
cd GitTempo
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create a `.env` file:
```env
GITHUB_TOKEN=your_github_personal_access_token
```

4. Run the development server
```bash
npm run dev
```

5. Open http://localhost:3000

## Usage

1. Enter a public GitHub repository URL (e.g., `https://github.com/owner/repo`)
2. Click "Generate Graph" to fetch commit data
3. View visualizations of the previous 500 commits
4. Use filters to focus on specific time periods, contributors, or patterns
5. Explore different chart types and metrics

## Project Structure

```
.
├── components
│   ├── Controls.tsx
│   └── GitGraph.tsx
├── pages
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── api
│   │   ├── fetchCommits.ts
│   │   └── hello.ts
│   ├── graph.tsx
│   └── index.tsx
├── public
│   ├── favicon.ico
│   └── logo.png
├── styles
│   └── globals.css
├── types.ts
└── utils
    └── fetchCommits.ts
```

## GitHub API Integration

The application uses the GitHub REST API to fetch commit data:
- Retrieves up to 500 most recent commits per repository
- Includes commit metadata (author, date, message, stats)
- Respects GitHub API rate limits
- Requires authentication token for extended limits

## Chart Types

- **Commit Timeline**: Line chart showing commits over time
- **Contributor Distribution**: Bar chart of commits per contributor
- **Hour of Day**: Heatmap showing when commits are made
- **Day of Week**: Bar chart showing daily patterns
- **Commit Frequency**: Histogram of commit activity

## Deployment

The application is deployed on Vercel. 

## License

MIT License - see LICENSE file for details.

## Contact

- GitHub: [@cjuyematsu](https://github.com/cjuyematsu)
- Issues: [GitHub Issues](https://github.com/cjuyematsu/GitTempo/issues)

---

Built with Next.js, TypeScript, and Chart.js | © 2025
