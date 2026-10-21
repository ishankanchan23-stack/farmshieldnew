# Configuring image classification

FarmShield does **not** ship model weights or claim inference by default. With `MODEL_PATH` blank, scans can be stored but show `AI model unavailable — demo mode is active.` No hardcoded or random class is returned.

## Compatible checkpoint contract

The service supports PyTorch state dictionaries for `resnet18` or `mobilenet_v3_small`, constructed by `torchvision` with the final classifier sized to the number of classes in `MODEL_LABELS_PATH`. The checkpoint must match that architecture and output count exactly; a plain state dict or `{ "state_dict": ... }` is accepted. Use a trusted checkpoint only.

1. Obtain or train a model whose class mapping and evaluation protocol are documented. The PlantVillage image dataset is useful for research and classroom experimentation but contains controlled-condition imagery and does not establish field diagnostic performance. Review the dataset's terms and cite Hughes & Salathé, *An open access repository of images on plant health*, arXiv:1511.08060.
2. Train/save the final model weights with the matching classifier output layer. Do not publish a model unless its license and dataset terms allow it.
3. Save labels in exact output-index order as a JSON string list. `app/data/tomato_classes.json` is a sample PlantVillage-style tomato order, not proof that any arbitrary model uses that order. For a multi-crop checkpoint, prefix each label with its crop and three underscores, such as `Tomato___healthy`, `Mango___Anthracnose`, or `Chili___Leaf_curl`.
4. Keep model files outside Git and configure `MODEL_PATH`, `MODEL_ARCH`, `MODEL_LABELS_PATH`, and `MODEL_VERSION` in `backend/.env`.
5. Install the optional dependencies for a compatible interpreter/platform using `pip install -r requirements-ai.txt`, then restart the API. Startup logs report `ready`, `unavailable`, or `error`.

The inference preprocessing is RGB, resize shorter edge to 256, center-crop 224×224, tensor conversion, and ImageNet mean/std normalization. That preprocessing must match the training pipeline. Inference filters the configured labels to the selected crop before choosing a class; if there are no labels for that crop, the scan is saved without a prediction. Logits are softmaxed; below `CONFIDENCE_THRESHOLD`, the output is marked uncertain. Confidence is not calibrated real-world accuracy. The system does not infer severity or generate Grad-CAM maps.

Invalid or incompatible model files produce a visible model error state. Never remove the warning to make a demo appear successful.
