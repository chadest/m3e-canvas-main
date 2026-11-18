/* The legal text shown in the About dialog. Keeping it in one module means the dialog, the
 * README and the shipped files all tell the same story, and changing the fork URL is one edit. */

export const ORIGINAL_REPO_URL = "https://github.com/lnkiai/m3e-canvas";
export const MODIFIED_REPO_URL = "https://github.com/chadest";
export const MODIFIED_ORG = "Chades't creative";

export const MIT_TEXT = `MIT License

Copyright (c) 2026 lnkiai
Copyright (c) 2026 Chades't creative - Modified and extended edition

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const NOTICES_TEXT = `M3E Canvas

This product contains code ported from material-components-android
(Apache License 2.0):
  Copyright (C) 2024 The Android Open Source Project
  https://github.com/material-components/material-components-android

  LoadingIndicatorAnimatorDelegate.java -> lib/shapes.ts (LoadingAnimator, Spring)
  LoadingIndicatorDrawingDelegate.java  -> lib/shapes.ts (shape sampling)

The port follows the TypeScript adaptation in
https://github.com/Aler1x/m3-loading-indicator (Apache License 2.0,
Copyright 2026 Alerix).

This product contains SVG shape path data from Material Design assets:
  Copyright (C) 2024 Google LLC
  https://m3.material.io/components/loading-indicator

Derivative work
---------------
This project is derived from M3E Canvas by lnkiai, licensed under the MIT
License: https://github.com/lnkiai/m3e-canvas

Modified and extended edition:
  Copyright (c) 2026 Chades't creative
  https://github.com/chadest

Icons: Material Symbols by Google, Apache License 2.0.
Icons: Lucide Icons, ISC License (MIT-compatible).
`;
