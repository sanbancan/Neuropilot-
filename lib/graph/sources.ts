import type { ScientificSource } from '@/lib/schemas/knowledge'

/** Scope is deliberately narrow: reviewed metadata/abstracts are not full-protocol verification. */
export const SOURCES: ScientificSource[] = [
  {
    id: 'curated:legacy-v1', kind: 'curated_entry', title: 'NeuroPilot legacy hackathon catalog',
    authors: ['NeuroPilot'], year: null, doi: null, url: null, venue: null,
    verification: 'unverified', reviewedAt: null,
    scope: 'Legacy seed assertions and illustrative defaults; not independently verified scientific evidence.',
  },
  {
    id: 'doi:10.1109/86.895946', kind: 'publication',
    title: 'Optimal spatial filtering of single trial EEG during imagined hand movement',
    authors: ['H. Ramoser', 'J. Müller-Gerking', 'G. Pfurtscheller'], year: 2000,
    doi: '10.1109/86.895946', url: 'https://pubmed.ncbi.nlm.nih.gov/11204034/',
    venue: 'IEEE Transactions on Rehabilitation Engineering, 8(4), 441–446',
    verification: 'reviewed', reviewedAt: '2026-11-06',
    scope: 'Abstract supports CSP applied to multichannel EEG for left/right imagined hand movement. Does not establish a universal montage, protocol, or expected accuracy.',
  },
  {
    id: 'doi:10.1109/TBME.2006.886577', kind: 'publication',
    title: 'Frequency recognition based on canonical correlation analysis for SSVEP-based BCIs',
    authors: ['Zhonglin Lin', 'Changshui Zhang', 'Wei Wu', 'Xiaorong Gao'], year: 2006,
    doi: '10.1109/TBME.2006.886577', url: 'https://pubmed.ncbi.nlm.nih.gov/17152442/',
    venue: 'IEEE Transactions on Biomedical Engineering, 53(12 Pt 2), 2610–2614',
    verification: 'reviewed', reviewedAt: '2026-11-06',
    scope: 'Abstract supports CCA-based frequency recognition in EEG SSVEP. No project performance guarantee or universal acquisition settings.',
  },
  {
    id: 'doi:10.1016/j.clinph.2007.07.028', kind: 'publication',
    title: 'EEG differences between eyes-closed and eyes-open resting conditions',
    authors: ['Robert J. Barry', 'Adam R. Clarke', 'Stuart J. Johnstone', 'Christopher A. Magee', 'Jacqueline A. Rushby'],
    year: 2007, doi: '10.1016/j.clinph.2007.07.028', url: 'https://pubmed.ncbi.nlm.nih.gov/17911042/',
    venue: 'Clinical Neurophysiology, 118(12), 2765–2773', verification: 'reviewed', reviewedAt: '2026-11-06',
    scope: 'Abstract reports alpha power differences between eyes-open and eyes-closed resting recordings. Supports controlling eye state, not a specific meditation detector, montage, or expected performance.',
  },
  {
    id: 'manufacturer:openbci-boards', kind: 'manufacturer_specification',
    title: 'OpenBCI Hardware & Software FAQ', authors: ['OpenBCI'], year: null, doi: null,
    url: 'https://docs.openbci.com/FAQ/HardFAQ/', venue: null,
    verification: 'reviewed', reviewedAt: '2026-11-06',
    scope: 'Standard wireless modes: Cyton 8 channels at 250 Hz; Cyton + Daisy 16 channels at 125 Hz; Ganglion 4 channels at 200 Hz. Specifications do not prove suitability for a particular experiment.',
  },
  {
    id: 'dataset:physionet-eegmmidb-1.0.0', kind: 'dataset_documentation',
    title: 'EEG Motor Movement/Imagery Dataset, version 1.0.0', authors: ['Gerwin Schalk'], year: 2009,
    doi: '10.13026/C28G6P', url: 'https://physionet.org/content/eegmmidb/1.0.0/', venue: 'PhysioNet',
    verification: 'reviewed', reviewedAt: '2026-11-06',
    scope: 'Official documentation describes motor execution and imagery, baseline runs, 64 EEG channels and 160 Hz recording. Offline development data; no evidence of performance on user hardware.',
  },
]
