23:45:46.407 Running build in Washington, D.C., USA (East) – iad1
23:45:46.408 Build machine configuration: 2 cores, 8 GB
23:45:46.633 Cloning github.com/A0ik/FacturmeWeb (Branch: main, Commit: d084d5b)
23:45:46.957 Warning: Failed to fetch one or more git submodules
23:45:46.958 Cloning completed: 325.000ms
23:45:48.853 Restored build cache from previous deployment (8ZRiPULfeqzpyqNVF3NAH6iFT6bg)
23:45:50.134 Running "vercel build"
23:45:50.758 Vercel CLI 50.42.0
23:45:51.026 Installing dependencies...
23:45:52.861 
23:45:52.862 added 5 packages in 2s
23:45:52.862 
23:45:52.862 49 packages are looking for funding
23:45:52.862   run `npm fund` for details
23:45:52.892 Detected Next.js version: 15.5.14
23:45:52.893 Running "next build"
23:45:53.980    ▲ Next.js 15.5.14
23:45:53.980 
23:45:54.069    Creating an optimized production build ...
23:46:14.822  ✓ Compiled successfully in 18.1s
23:46:14.826    Linting and checking validity of types ...
23:46:28.829 Failed to compile.
23:46:28.830 
23:46:28.830 ./app/(app)/capture/page.tsx:396:41
23:46:28.831 Type error: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'.
23:46:28.831   Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
23:46:28.831     Types of property 'buffer' are incompatible.
23:46:28.831       Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
23:46:28.831         Type 'SharedArrayBuffer' is missing the following properties from type 'ArrayBuffer': resizable, resize, detached, transfer, transferToFixedLength
23:46:28.832 
23:46:28.832 [0m [90m 394 |[39m               [36mconst[39m pdfBytes [33m=[39m [36mawait[39m newPdf[33m.[39msave()[33m;[39m
23:46:28.832  [90m 395 |[39m               [36mconst[39m baseName [33m=[39m f[33m.[39mname[33m.[39mreplace([35m/\.[^/.]+$/[39m[33m,[39m [32m""[39m)[33m;[39m
23:46:28.832 [31m[1m>[22m[39m[90m 396 |[39m               [36mconst[39m newFile [33m=[39m [36mnew[39m [33mFile[39m([pdfBytes][33m,[39m [32m`${baseName}_p${i + 1}.pdf`[39m[33m,[39m { type[33m:[39m [32m'application/pdf'[39m })[33m;[39m
23:46:28.833  [90m     |[39m                                         [31m[1m^[22m[39m
23:46:28.833  [90m 397 |[39m               finalFiles[33m.[39mpush(newFile)[33m;[39m
23:46:28.833  [90m 398 |[39m             }
23:46:28.834  [90m 399 |[39m           } [36melse[39m {[0m
23:46:28.873 Next.js build worker exited with code: 1 and signal: null
23:46:28.891 Error: Command "next build" exited with 1