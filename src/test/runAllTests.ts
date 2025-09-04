#!/usr/bin/env node

/**
 * Comprehensive Test Runner - The most advanced test runner ever built!
 * This script runs all our tests with comprehensive reporting and coverage.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  averageCoverage: number;
  suites: TestResult[];
  performance: {
    averageTestTime: number;
    slowestSuite: string;
    fastestSuite: string;
  };
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Test Suite - The Greatest Tests Ever Written!');
    console.log('=' .repeat(80));

    // Ensure test results directory exists
    if (!existsSync('test-results')) {
      mkdirSync('test-results', { recursive: true });
    }

    // Run different test suites
    await this.runUnitTests();
    await this.runComponentTests();
    await this.runServiceTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runAccessibilityTests();

    return this.generateReport();
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(): Promise<void> {
    console.log('\n📝 Running Unit Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose src/test/utils/', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Unit Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Unit Tests completed successfully');
    } catch (error) {
      console.error('❌ Unit Tests failed:', error);
      this.results.push({
        suite: 'Unit Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Run component tests
   */
  private async runComponentTests(): Promise<void> {
    console.log('\n🧩 Running Component Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose src/components/', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Component Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Component Tests completed successfully');
    } catch (error) {
      console.error('❌ Component Tests failed:', error);
      this.results.push({
        suite: 'Component Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Run service tests
   */
  private async runServiceTests(): Promise<void> {
    console.log('\n⚙️ Running Service Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose src/services/', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Service Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Service Tests completed successfully');
    } catch (error) {
      console.error('❌ Service Tests failed:', error);
      this.results.push({
        suite: 'Service Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose src/test/integration/', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Integration Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Integration Tests completed successfully');
    } catch (error) {
      console.error('❌ Integration Tests failed:', error);
      this.results.push({
        suite: 'Integration Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose --testNamePattern="Performance"', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Performance Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Performance Tests completed successfully');
    } catch (error) {
      console.error('❌ Performance Tests failed:', error);
      this.results.push({
        suite: 'Performance Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Run accessibility tests
   */
  private async runAccessibilityTests(): Promise<void> {
    console.log('\n♿ Running Accessibility Tests...');
    try {
      const output = execSync('npm run test:run -- --reporter=verbose --testNamePattern="Accessibility"', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        suite: 'Accessibility Tests',
        passed: this.extractPassed(output),
        failed: this.extractFailed(output),
        skipped: this.extractSkipped(output),
        duration: this.extractDuration(output),
        coverage: this.extractCoverage(output)
      });
      
      console.log('✅ Accessibility Tests completed successfully');
    } catch (error) {
      console.error('❌ Accessibility Tests failed:', error);
      this.results.push({
        suite: 'Accessibility Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0
      });
    }
  }

  /**
   * Extract test statistics from output
   */
  private extractPassed(output: string): number {
    const match = output.match(/(\d+) passed/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractFailed(output: string): number {
    const match = output.match(/(\d+) failed/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractSkipped(output: string): number {
    const match = output.match(/(\d+) skipped/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractDuration(output: string): number {
    const match = output.match(/(\d+\.\d+)s/);
    return match ? parseFloat(match[1]) : 0;
  }

  private extractCoverage(output: string): number {
    const match = output.match(/All files\s+\|\s+(\d+\.\d+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): TestReport {
    const totalTests = this.results.reduce((sum, result) => sum + result.passed + result.failed + result.skipped, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalSkipped = this.results.reduce((sum, result) => sum + result.skipped, 0);
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
    const averageCoverage = this.results.reduce((sum, result) => sum + (result.coverage || 0), 0) / this.results.length;

    const slowestSuite = this.results.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
    const fastestSuite = this.results.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest
    );

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      averageCoverage,
      suites: this.results,
      performance: {
        averageTestTime: totalDuration / this.results.length,
        slowestSuite: slowestSuite.suite,
        fastestSuite: fastestSuite.suite
      }
    };

    // Save report to file
    writeFileSync('test-results/comprehensive-test-report.json', JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);

    return report;
  }

  /**
   * Generate HTML test report
   */
  private generateHTMLReport(report: TestReport): void {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>گزارش جامع تست‌ها - Iranian Legal Archive</title>
    <style>
        body { font-family: 'Tahoma', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin: 0; font-size: 2.5em; }
        .header p { color: #7f8c8d; margin: 10px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .stat-card h3 { margin: 0 0 10px 0; font-size: 2em; }
        .stat-card p { margin: 0; opacity: 0.9; }
        .suite-results { margin: 30px 0; }
        .suite-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .suite-card h3 { margin: 0 0 15px 0; color: #495057; }
        .suite-stats { display: flex; justify-content: space-between; align-items: center; }
        .status { padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status.passed { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .status.skipped { background: #fff3cd; color: #856404; }
        .performance { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .performance h3 { margin: 0 0 15px 0; color: #1976d2; }
        .performance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .performance-item { text-align: center; }
        .performance-item strong { display: block; font-size: 1.2em; color: #1976d2; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>گزارش جامع تست‌ها</h1>
            <p>سیستم آرشیو حقوقی ایران - ${new Date(report.timestamp).toLocaleDateString('fa-IR')}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <h3>${report.totalTests}</h3>
                <p>کل تست‌ها</p>
            </div>
            <div class="stat-card">
                <h3>${report.totalPassed}</h3>
                <p>تست‌های موفق</p>
            </div>
            <div class="stat-card">
                <h3>${report.totalFailed}</h3>
                <p>تست‌های ناموفق</p>
            </div>
            <div class="stat-card">
                <h3>${report.averageCoverage.toFixed(1)}%</h3>
                <p>پوشش کد</p>
            </div>
        </div>

        <div class="suite-results">
            <h2>نتایج تست‌های مختلف</h2>
            ${report.suites.map(suite => `
                <div class="suite-card">
                    <h3>${suite.suite}</h3>
                    <div class="suite-stats">
                        <div>
                            <span class="status passed">${suite.passed} موفق</span>
                            <span class="status failed">${suite.failed} ناموفق</span>
                            <span class="status skipped">${suite.skipped} رد شده</span>
                        </div>
                        <div>
                            <strong>${suite.duration.toFixed(2)}s</strong>
                            ${suite.coverage ? `<span>پوشش: ${suite.coverage.toFixed(1)}%</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="performance">
            <h3>آمار عملکرد</h3>
            <div class="performance-grid">
                <div class="performance-item">
                    <strong>${report.performance.averageTestTime.toFixed(2)}s</strong>
                    <span>میانگین زمان تست</span>
                </div>
                <div class="performance-item">
                    <strong>${report.performance.slowestSuite}</strong>
                    <span>کندترین تست</span>
                </div>
                <div class="performance-item">
                    <strong>${report.performance.fastestSuite}</strong>
                    <span>سریع‌ترین تست</span>
                </div>
                <div class="performance-item">
                    <strong>${report.totalDuration.toFixed(2)}s</strong>
                    <span>کل زمان</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>گزارش تولید شده در ${new Date(report.timestamp).toLocaleString('fa-IR')}</p>
            <p>سیستم آرشیو حقوقی ایران - بهترین سیستم تست در خاورمیانه!</p>
        </div>
    </div>
</body>
</html>`;

    writeFileSync('test-results/comprehensive-test-report.html', html);
  }

  /**
   * Print final summary
   */
  printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE TEST SUITE COMPLETED!');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.totalPassed}`);
    console.log(`❌ Failed: ${report.totalFailed}`);
    console.log(`⏭️ Skipped: ${report.totalSkipped}`);
    console.log(`📈 Coverage: ${report.averageCoverage.toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${report.totalDuration.toFixed(2)}s`);
    console.log(`🏆 Success Rate: ${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));
    console.log('📁 Reports saved to: test-results/');
    console.log('🌐 HTML Report: test-results/comprehensive-test-report.html');
    console.log('📄 JSON Report: test-results/comprehensive-test-report.json');
    console.log('='.repeat(80));
  }
}

// Run the comprehensive test suite
async function main() {
  const runner = new ComprehensiveTestRunner();
  const report = await runner.runAllTests();
  runner.printSummary(report);
  
  // Exit with appropriate code
  process.exit(report.totalFailed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ComprehensiveTestRunner;