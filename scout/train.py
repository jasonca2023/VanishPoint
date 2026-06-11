"""Fine-tune a small Hugging Face transformer to recognize digital-footprint
signals in email headers. Saves the model to scout/model/.

Run:  .venv/bin/python train.py
"""

import numpy as np
import torch
from datasets import Dataset
from sklearn.metrics import accuracy_score, classification_report
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

from dataset import LABELS, build

BASE_MODEL = "prajjwal1/bert-tiny"  # 4.4M params — trains and scans fast on CPU
OUT_DIR = "model"


def main() -> None:
    texts, labels = build(per_class=900)
    split = int(len(texts) * 0.9)
    train_ds = Dataset.from_dict({"text": texts[:split], "label": labels[:split]})
    eval_ds = Dataset.from_dict({"text": texts[split:], "label": labels[split:]})

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=64)

    train_ds = train_ds.map(tokenize, batched=True)
    eval_ds = eval_ds.map(tokenize, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(LABELS),
        id2label=dict(enumerate(LABELS)),
        label2id={l: i for i, l in enumerate(LABELS)},
    )

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"training on {device}, {len(train_ds)} train / {len(eval_ds)} eval")

    args = TrainingArguments(
        output_dir="checkpoints",
        num_train_epochs=4,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=64,
        learning_rate=1e-4,
        eval_strategy="epoch",
        save_strategy="no",
        logging_steps=50,
        report_to=[],
        use_cpu=device == "cpu",
    )

    def metrics(pred):
        preds = np.argmax(pred.predictions, axis=1)
        return {"accuracy": accuracy_score(pred.label_ids, preds)}

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=metrics,
    )
    trainer.train()

    preds = np.argmax(trainer.predict(eval_ds).predictions, axis=1)
    print(classification_report(eval_ds["label"], preds, target_names=LABELS))

    trainer.save_model(OUT_DIR)
    tokenizer.save_pretrained(OUT_DIR)
    print(f"saved to {OUT_DIR}/")


if __name__ == "__main__":
    main()
