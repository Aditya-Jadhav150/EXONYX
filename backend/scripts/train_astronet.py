import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np

# EXONYX AstroNet V1 (RTX 3050 Optimized)
# A simplified 1D CNN for Phase-Folded Transit Validation

class AstroNet1D(nn.Module):
    def __init__(self):
        super(AstroNet1D, self).__init__()
        # Global View CNN
        self.conv1 = nn.Conv1d(1, 16, kernel_size=5, stride=1, padding=2)
        self.conv2 = nn.Conv1d(16, 32, kernel_size=5, stride=2, padding=2)
        self.conv3 = nn.Conv1d(32, 64, kernel_size=5, stride=2, padding=2)
        
        self.pool = nn.MaxPool1d(2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        
        # After 3 convs with stride 2 and 3 max pools of 2, the sequence length drops significantly.
        # Assuming input length 1000 -> conv1(1000) -> pool(500) -> conv2(250) -> pool(125) -> conv3(63) -> pool(31)
        self.fc1 = nn.Linear(64 * 31, 128)
        self.fc2 = nn.Linear(128, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (batch_size, 1, 1000)
        x = self.relu(self.pool(self.conv1(x)))
        x = self.relu(self.pool(self.conv2(x)))
        x = self.relu(self.pool(self.conv3(x)))
        
        x = x.view(x.size(0), -1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.sigmoid(self.fc2(x))
        return x

class KOIDataset(Dataset):
    def __init__(self, csv_file, seq_len=1000):
        self.data = pd.read_csv(csv_file)
        self.seq_len = seq_len
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        # In a full pipeline, we would dynamically load the FITS file, detrend, phase fold, and extract the vector.
        # For this skeleton/training script, we simulate the phase-folded light curve extraction 
        # using noise since we don't want to dynamically download 10,000 FITS files during training right now.
        # In actual production training, this dataset class would read pre-processed .npy tensors from data_cache/training/
        row = self.data.iloc[idx]
        label = float(row['label'])
        
        # Simulated phase folded array (length 1000)
        flux = np.ones(self.seq_len) + np.random.normal(0, 0.001, self.seq_len)
        if label == 1.0:
            # Inject simulated transit at center
            center = self.seq_len // 2
            width = 20
            depth = row.get('koi_depth', 1000) / 1e6
            flux[center-width:center+width] -= depth
            
        tensor = torch.tensor(flux, dtype=torch.float32).unsqueeze(0) # Shape: (1, 1000)
        return tensor, torch.tensor([label], dtype=torch.float32)

def train_model():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_csv = os.path.join(BASE_DIR, "datasets", "train_split.csv")
    val_csv = os.path.join(BASE_DIR, "datasets", "validation_split.csv")
    model_save_path = os.path.join(BASE_DIR, "data_cache", "models", "astronet_v1.pt")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Hardware allocated: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print("Mixed Precision Training enabled for RTX 3050.")

    print("Loading datasets...")
    train_dataset = KOIDataset(train_csv)
    val_dataset = KOIDataset(val_csv)
    
    # Batch size 64 fits well in 4GB VRAM for 1D CNN
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

    model = AstroNet1D().to(device)
    criterion = nn.BCELoss()
    optimizer = optim.AdamW(model.parameters(), lr=1e-3)
    scaler = torch.amp.GradScaler('cuda') if device.type == 'cuda' else None

    epochs = 5
    best_val_loss = float('inf')

    print(f"Beginning training over {epochs} epochs...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for batch_idx, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            
            if scaler:
                with torch.amp.autocast('cuda'):
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
            train_loss += loss.item()
            
            if batch_idx % 20 == 0:
                print(f"  Epoch [{epoch+1}/{epochs}] Batch [{batch_idx}/{len(train_loader)}] Loss: {loss.item():.4f}")

        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                
                predicted = (outputs > 0.5).float()
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        avg_val_loss = val_loss / len(val_loader)
        accuracy = 100 * correct / total
        print(f"Epoch {epoch+1} Summary: Train Loss={train_loss/len(train_loader):.4f}, Val Loss={avg_val_loss:.4f}, Val Acc={accuracy:.2f}%")
        
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), model_save_path)
            print(f"  --> Saved improved model to {model_save_path}")

    print("Training complete!")

if __name__ == "__main__":
    train_model()
