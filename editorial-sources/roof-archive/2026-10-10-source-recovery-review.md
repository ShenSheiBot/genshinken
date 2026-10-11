# Review of source restorations from the Japanese publication batch

The four Chinese articles changed in commit ef7f47e were checked against archived source material rather than reverted wholesale. No additional Chinese prose was rewritten in this review.

- **Hair-colour analysis (cv21792051):** source figures 58 and 64 label orange and brown hair respectively. The two updated image descriptions match those labels. The original table image, 81.png, reads 糊涂 in the orange-hair row and 面瘫 in the white-hair row. Replacing the former OCR readings 毒舌 and 困难 restores the source cells; it does not revise the author's analysis.
- **Godzilla (cv3064956):** source paragraph 76 contains image `8c9a79f9404cd2ca7208cf129b171784d026e734.png`. Its downloaded SHA-256 is `62e35b97dd9b873c915f8155a80845cec20f85be4ab023f2d40ef856b461d558`, identical to the restored dining image. Reverting to the prop photograph would reintroduce the wrong image.
- **Penguin Highway (cv3120530):** the restored book image and Hamamoto screenshot match source paragraphs 9 and 119 byte-for-byte. Their SHA-256 values are `88ba96af513dd80a69a8118c441cbc277957024028220e74d516fea4c6f9a913` and `e5d6e96d51397458fdf1f174854fca5b61765e4c8117514cad10a30ea8bd1e0f`. The childhood image matches paragraph 91 (`1a03a796c40ab8fdca799277b1c2fd62b7f29dd7969be3d326add509b53b0395`). Source paragraph order, not interpretation of the argument, governs their placement.
- **Three essays on tokusatsu (cv3154640):** the four restored quotations occur in source paragraphs 12, 40, 104 and 134. The additions restore omitted source text, not newly researched quotations.

The original archival records remain the authority. Historical cleaning notes are retained, even where they incorrectly reported complete image or quotation recovery.
