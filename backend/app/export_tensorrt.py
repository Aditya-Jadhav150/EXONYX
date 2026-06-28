import os
import torch
import torch.nn as nn

class AstroNet1D(nn.Module):
    def __init__(self):
        super(AstroNet1D, self).__init__()
        self.conv1 = nn.Conv1d(1, 16, kernel_size=5, stride=1, padding=2)
        self.conv2 = nn.Conv1d(16, 32, kernel_size=5, stride=2, padding=2)
        self.conv3 = nn.Conv1d(32, 64, kernel_size=5, stride=2, padding=2)
        
        self.pool = nn.MaxPool1d(2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        
        self.fc1 = nn.Linear(64 * 31, 128)
        self.fc2 = nn.Linear(128, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.pool(self.conv1(x)))
        x = self.relu(self.pool(self.conv2(x)))
        x = self.relu(self.pool(self.conv3(x)))
        
        x = x.view(x.size(0), -1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.sigmoid(self.fc2(x))
        return x

def export_model():
    print("Loading PyTorch AstroNet weights...")
    model_path = os.path.join(os.path.dirname(__file__), "..", "data_cache", "models", "astronet_v1.pt")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(model_path), exist_ok=True)

    if not os.path.exists(model_path):
        print(f"Model file not found at {model_path}. Creating a dummy model for export testing.")
        model = AstroNet1D()
        torch.save(model.state_dict(), model_path)
        
    device = torch.device("cpu")
    model = AstroNet1D().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model.eval()

    dummy_input = torch.randn(1, 1, 1000, device=device)
    onnx_path = os.path.join(os.path.dirname(__file__), "..", "data_cache", "models", "astronet_v1.onnx")
    
    print(f"Exporting ONNX model to {onnx_path}...")
    torch.onnx.export(
        model, 
        dummy_input, 
        onnx_path, 
        export_params=True, 
        opset_version=14, 
        do_constant_folding=True, 
        input_names=['input'], 
        output_names=['output'], 
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print("ONNX export complete.")
    print("TensorRT Engine can be built dynamically by ONNXRuntime TensorrtExecutionProvider.")

if __name__ == "__main__":
    export_model()
