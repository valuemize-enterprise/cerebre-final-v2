'use client';
import { useState } from 'react';
import { Download, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function WordPressIntegrationPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const STEPS = [
    {
      title: 'Download the plugin',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Download the Cerebre WordPress plugin. This is a single PHP file you install on your site.
          </p>
          <a href="/api/integrations/wordpress/download"
            className="btn-primary inline-flex" download="cerebre-intelligence.php">
            <Download className="w-4 h-4" /> Download cerebre.php
          </a>
          <p className="text-xs text-gray-400">
            File size: ~15KB · No dependencies · Compatible with WordPress 5.0+
          </p>
        </div>
      ),
    },
    {
      title: 'Install on WordPress',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">Two ways to install:</p>
          <div className="space-y-3">
            <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-xl">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400 mb-2">Option A — Upload via WordPress admin (easiest)</p>
              <ol className="text-sm text-brand-800 dark:text-brand-300 space-y-1 list-decimal ml-4">
                <li>Go to WP Admin → Plugins → Add New Plugin</li>
                <li>Click "Upload Plugin"</li>
                <li>Choose the cerebre.php file you downloaded</li>
                <li>Click "Install Now" then "Activate Plugin"</li>
              </ol>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Option B — FTP / File Manager</p>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal ml-4">
                <li>Create a folder: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">/wp-content/plugins/cerebre-intelligence/</code></li>
                <li>Upload cerebre.php into that folder</li>
                <li>Go to WP Admin → Plugins → activate "Cerebre Intelligence Connector"</li>
              </ol>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Configure the plugin',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            After activation, go to <strong>WP Admin → Settings → Cerebre</strong> and fill in:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</p>
                <p className="text-xs text-gray-400">Paste below — copy your key from here</p>
              </div>
              <button onClick={() => api.get('/settings/api-key').then(({ data }) => {
                setApiKey(data.apiKey);
                copy(data.apiKey, 'apikey');
              })} className="btn-secondary text-xs py-1.5">
                {copied === 'apikey' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy API key
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand ID</p>
                <p className="text-xs text-gray-400">Your unique brand identifier</p>
              </div>
              <button onClick={() => api.get('/settings/brand-id').then(({ data }) => {
                copy(data.brandId, 'brandid');
              })} className="btn-secondary text-xs py-1.5">
                {copied === 'brandid' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Brand ID
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Click "Test connection" in the plugin settings to confirm it's working.
          </p>
        </div>
      ),
    },
    {
      title: 'Verify data is flowing',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            After saving settings, visit any page on your WordPress site. Then check:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-none">
            {[
              'Cerebre dashboard → Platforms → Website/GA4 tab should show recent page views within 5 minutes',
              'If you have WooCommerce: place a test order — it should appear in Metrics → Revenue within 30 seconds',
              'Submit a contact form — it should register as a Lead in Metrics',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">{i+1}.</span>{item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔵</span>
          <span className="section-title text-brand-600">Website Integration</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">WordPress + WooCommerce</h1>
        <p className="text-sm text-gray-400 mt-1">
          Connect your WordPress site to send page views, leads, and orders to Cerebre automatically
        </p>
      </div>

      {/* What this integration does */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">What gets tracked</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Frequency</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Where in Cerebre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {[
              ['Page views & sessions', 'Hourly batch', 'Platforms → Website'],
              ['Contact form submissions', 'Real-time', 'Metrics → Leads'],
              ['WooCommerce orders', 'Real-time', 'Social Commerce → Revenue'],
              ['Add to cart events', 'Real-time', 'Funnel → Cart stage'],
              ['Cart abandonment', 'Real-time', 'Funnel → Drop-off'],
              ['Top products sold', 'Daily', 'Industry Intelligence'],
              ['Traffic sources', 'Daily', 'Attribution model'],
            ].map(([event, freq, location]) => (
              <tr key={event} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{event}</td>
                <td className="px-4 py-3 text-gray-500">{freq}</td>
                <td className="px-4 py-3 text-brand-600 dark:text-brand-400 text-xs">{location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Step-by-step */}
      <div className="space-y-3">
        {STEPS.map((s, i) => (
          <div key={i} className="card overflow-hidden">
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              onClick={() => setStep(step === i ? -1 : i)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > i ? 'bg-green-500 text-white' : step === i ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                {step > i ? '✓' : i + 1}
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">{s.title}</p>
              {step === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
            {step === i && (
              <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-800">
                {s.content}
                {i < STEPS.length - 1 && (
                  <button onClick={() => setStep(i + 1)} className="btn-primary text-sm mt-4">
                    Next step →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Need help */}
      <div className="card p-5 text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Need help with the setup?</p>
        <p className="text-xs text-gray-400 mb-3">Your developer can email the plugin file to the WordPress site admin</p>
        <button onClick={() => window.open('/api/integrations/wordpress/download', '_blank')} className="btn-secondary text-sm">
          <Download className="w-4 h-4" /> Download cerebre.php again
        </button>
      </div>
    </div>
  );
}
